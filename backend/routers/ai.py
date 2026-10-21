import datetime
import io
from typing import Optional
from PIL import Image
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, DashcamVideo, SafetyEvent
from backend.schemas import SafetyEventResponse, EventFeedbackUpdate
from backend.auth import get_current_user, get_optional_user, log_audit_event
from backend.ai_service import AIServiceManager

router = APIRouter(prefix="/ai", tags=["AI Road-Safety Intelligence"])
ai_manager = AIServiceManager.get_instance()

@router.post("/analyze-video/{video_id}")
def trigger_video_analysis(
    video_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Triggers automated AI traffic sign perception on an uploaded dashcam video.
    Samples frames, applies multi-scale neural net inference & multi-agent consensus,
    and stores timestamped safety events with snapshots.
    """
    video = db.query(DashcamVideo).filter(DashcamVideo.id == video_id, DashcamVideo.user_id == current_user.id).first()
    if not video:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video recording not found.")

    video.status = "processing"
    db.commit()

    try:
        # Run AI Video Analysis
        events = ai_manager.analyze_video(
            video_path=video.file_path,
            video_id=video.id,
            user_id=current_user.id,
            sample_interval_sec=0.5,
            confidence_threshold=0.30
        )

        # Clear any prior events for this video
        db.query(SafetyEvent).filter(SafetyEvent.video_id == video.id).delete()

        # Insert newly detected events
        created_events = []
        for ev_data in events:
            se = SafetyEvent(**ev_data)
            db.add(se)
            created_events.append(se)

        video.status = "analyzed"
        video.processed_at = datetime.datetime.utcnow()
        db.commit()

        log_audit_event(db, current_user.id, "VIDEO_ANALYZED", details=f"Analyzed video #{video.id}: detected {len(created_events)} safety events.")

        return {
            "message": f"Analysis complete. Detected {len(created_events)} traffic safety events.",
            "video_id": video.id,
            "status": "analyzed",
            "events_count": len(created_events)
        }

    except Exception as e:
        video.status = "failed"
        db.commit()
        print(f"[AI ANALYSIS ERROR] {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Video analysis failed: {str(e)}"
        )

@router.post("/predict-frame")
async def predict_single_frame(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Real-time single-frame or webcam snapshot prediction.
    Applies multi-scale ROI search, neural net inference, and multi-agent arbitration.
    """
    try:
        contents = await file.read()
        pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
        result = ai_manager.predict_image(pil_img)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process image frame: {str(e)}"
        )

@router.put("/events/{event_id}/feedback")
def update_event_feedback(
    event_id: int,
    feedback_in: EventFeedbackUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Allows vehicle owner to mark detection as Confirmed or False Positive."""
    event = db.query(SafetyEvent).filter(SafetyEvent.id == event_id, SafetyEvent.user_id == current_user.id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Safety event not found.")

    event.user_feedback = feedback_in.feedback
    db.commit()
    log_audit_event(db, current_user.id, "EVENT_FEEDBACK", details=f"Marked event #{event.id} as {feedback_in.feedback}")
    return {"message": "Feedback recorded.", "feedback": feedback_in.feedback}

@router.get("/evaluation")
def get_model_evaluation_report():
    """Returns empirical measured test-set accuracy, precision, and latency metrics."""
    return ai_manager.get_evaluation_metrics()
