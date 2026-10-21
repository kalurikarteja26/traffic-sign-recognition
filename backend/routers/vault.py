import json
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, Vehicle, DashcamVideo, SafetyEvent
from backend.schemas import VideoResponse, BookmarkCreate, SafetyEventResponse
from backend.auth import get_current_user, log_audit_event
from backend.storage import validate_and_save_video, delete_stored_file

router = APIRouter(prefix="/vault", tags=["Dashcam Cloud Vault"])

@router.get("/quota")
def get_storage_quota(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's private storage quota metrics."""
    used = current_user.storage_used_bytes
    quota = current_user.storage_quota_bytes
    pct = round((used / max(1, quota)) * 100.0, 1)

    return {
        "used_bytes": used,
        "quota_bytes": quota,
        "used_mb": round(used / (1024 * 1024), 2),
        "quota_mb": round(quota / (1024 * 1024), 2),
        "percentage": min(100.0, pct)
    }

@router.get("/videos", response_model=List[VideoResponse])
def get_user_videos(
    vehicle_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieves all private dashcam videos belonging to the authenticated user."""
    query = db.query(DashcamVideo).filter(DashcamVideo.user_id == current_user.id)
    if vehicle_id:
        query = query.filter(DashcamVideo.vehicle_id == vehicle_id)

    videos = query.order_by(DashcamVideo.upload_date.desc()).all()
    results = []
    for v in videos:
        resp = VideoResponse.model_validate(v)
        resp.events_count = len(v.safety_events)
        if v.vehicle:
            resp.vehicle_reg = v.vehicle.reg_number
        results.append(resp)
    return results

@router.post("/videos/upload", response_model=VideoResponse, status_code=status.HTTP_201_CREATED)
def upload_dashcam_video(
    file: UploadFile = File(...),
    title: str = Form(...),
    vehicle_id: Optional[int] = Form(None),
    notes: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Uploads a dashcam recording to the user's private cloud vault."""
    # Check quota
    if current_user.storage_used_bytes >= current_user.storage_quota_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Storage quota exceeded. Please upgrade quota or delete older footage."
        )

    safe_name, abs_path, file_size = validate_and_save_video(file, current_user.id)

    # Update user storage
    current_user.storage_used_bytes += file_size

    new_video = DashcamVideo(
        user_id=current_user.id,
        vehicle_id=vehicle_id,
        title=title,
        filename=safe_name,
        file_path=abs_path,
        file_size_bytes=file_size,
        status="uploaded",
        notes=notes
    )
    db.add(new_video)
    db.commit()
    db.refresh(new_video)

    log_audit_event(db, current_user.id, "VIDEO_UPLOADED", details=f"Uploaded dashcam video '{title}' ({file_size} bytes)")

    resp = VideoResponse.model_validate(new_video)
    resp.events_count = 0
    if new_video.vehicle:
        resp.vehicle_reg = new_video.vehicle.reg_number
    return resp

@router.get("/videos/{video_id}")
def get_video_details(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Returns video metadata and all detected safety events."""
    video = db.query(DashcamVideo).filter(DashcamVideo.id == video_id, DashcamVideo.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video recording not found.")

    events = db.query(SafetyEvent).filter(SafetyEvent.video_id == video.id).order_by(SafetyEvent.timestamp_seconds.asc()).all()

    resp = VideoResponse.model_validate(video)
    resp.events_count = len(events)
    if video.vehicle:
        resp.vehicle_reg = video.vehicle.reg_number

    return {
        "video": resp,
        "events": [SafetyEventResponse.model_validate(e) for e in events],
        "bookmarks": json.loads(video.bookmarks_json) if video.bookmarks_json else []
    }

@router.get("/videos/{video_id}/stream")
def stream_video(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Securely streams private video file to authenticated user."""
    video = db.query(DashcamVideo).filter(DashcamVideo.id == video_id, DashcamVideo.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video recording not found.")

    p = Path(video.file_path)
    if not p.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video file is missing on storage.")

    media_type = "video/mp4"
    if p.suffix.lower() == ".webm":
        media_type = "video/webm"

    return FileResponse(path=str(p), media_type=media_type, filename=video.filename)

@router.post("/videos/{video_id}/bookmark")
def add_video_bookmark(
    video_id: int,
    bm: BookmarkCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Adds a timestamp bookmark with custom note to a video."""
    video = db.query(DashcamVideo).filter(DashcamVideo.id == video_id, DashcamVideo.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video recording not found.")

    existing_bm = json.loads(video.bookmarks_json) if video.bookmarks_json else []
    minutes = int(bm.timestamp_seconds // 60)
    seconds = int(bm.timestamp_seconds % 60)
    formatted = f"{minutes:02d}:{seconds:02d}"

    existing_bm.append({
        "timestamp_seconds": bm.timestamp_seconds,
        "formatted_time": formatted,
        "label": bm.label,
        "note": bm.note
    })
    video.bookmarks_json = json.dumps(existing_bm)
    db.commit()

    return {"message": "Bookmark added.", "bookmarks": existing_bm}

@router.delete("/videos/{video_id}")
def delete_video(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permanently deletes video recording, removes associated snapshots, and restores storage quota."""
    video = db.query(DashcamVideo).filter(DashcamVideo.id == video_id, DashcamVideo.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video recording not found.")

    file_size = video.file_size_bytes
    file_path = video.file_path

    # Delete video file
    delete_stored_file(file_path)

    # Delete snapshots
    for ev in video.safety_events:
        if ev.snapshot_path:
            delete_stored_file(ev.snapshot_path)

    # Restore storage quota
    current_user.storage_used_bytes = max(0, current_user.storage_used_bytes - file_size)

    title = video.title
    db.delete(video)
    db.commit()

    log_audit_event(db, current_user.id, "VIDEO_DELETED", details=f"Deleted video '{title}' ({file_size} bytes)")
    return {"message": f"Video '{title}' and associated safety events have been deleted."}
