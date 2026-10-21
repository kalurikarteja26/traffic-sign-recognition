import os
import shutil
import uuid
from pathlib import Path
from typing import Tuple
from fastapi import UploadFile, HTTPException, status

from backend.config import VIDEOS_DIR, CHALLANS_DIR, SNAPSHOTS_DIR

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi", ".webm", ".mkv"}
ALLOWED_DOC_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}

def validate_and_save_video(file: UploadFile, user_id: int) -> Tuple[str, str, int]:
    """
    Validates uploaded video file, writes to private user-isolated directory,
    and returns (relative_filename, absolute_path, file_size_bytes).
    """
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported video format. Allowed formats: {', '.join(ALLOWED_VIDEO_EXTENSIONS)}"
        )

    user_video_dir = VIDEOS_DIR / str(user_id)
    user_video_dir.mkdir(parents=True, exist_ok=True)

    safe_filename = f"{uuid.uuid4().hex}_{Path(file.filename).name}"
    dest_path = user_video_dir / safe_filename

    # Stream file to disk in chunks to avoid unbounded memory usage
    total_bytes = 0
    with open(dest_path, "wb") as buffer:
        while chunk := file.file.read(1024 * 1024): # 1MB chunks
            buffer.write(chunk)
            total_bytes += len(chunk)

    return safe_filename, str(dest_path), total_bytes

def validate_and_save_challan_doc(file: UploadFile, user_id: int) -> Tuple[str, str]:
    """Validates and saves a challan receipt or notice document."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_DOC_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported document format. Allowed: {', '.join(ALLOWED_DOC_EXTENSIONS)}"
        )

    user_doc_dir = CHALLANS_DIR / str(user_id)
    user_doc_dir.mkdir(parents=True, exist_ok=True)

    safe_filename = f"{uuid.uuid4().hex}_{Path(file.filename).name}"
    dest_path = user_doc_dir / safe_filename

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return safe_filename, str(dest_path)

def delete_stored_file(file_path: str):
    """Safely removes a stored file if it exists."""
    try:
        p = Path(file_path)
        if p.exists() and p.is_file():
            p.unlink()
    except Exception as e:
        print(f"[STORAGE ERROR] Could not delete file {file_path}: {e}")
