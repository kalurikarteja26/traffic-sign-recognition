import shutil
import torch
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, Vehicle, Challan, DashcamVideo, SafetyEvent, AuditLog
from backend.schemas import UserResponse, AuditLogResponse
from backend.auth import get_current_admin
from backend.config import STORAGE_DIR

router = APIRouter(prefix="/admin", tags=["Admin & Operations Dashboard"])

@router.get("/metrics")
def get_admin_metrics(
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Platform-wide operational analytics for authorized system administrators."""
    total_users = db.query(User).count()
    total_vehicles = db.query(Vehicle).count()
    total_challans = db.query(Challan).count()
    total_videos = db.query(DashcamVideo).count()
    total_events = db.query(SafetyEvent).count()

    # Calculate total storage on disk
    total_storage_used = sum(u.storage_used_bytes for u in db.query(User).all())

    # Disk usage
    total, used, free = shutil.disk_usage(str(STORAGE_DIR))

    return {
        "total_users": total_users,
        "total_vehicles": total_vehicles,
        "total_challans": total_challans,
        "total_dashcam_videos": total_videos,
        "total_detected_events": total_events,
        "total_user_storage_bytes": total_storage_used,
        "total_user_storage_mb": round(total_storage_used / (1024 * 1024), 2),
        "disk_free_gb": round(free / (1024 * 1024 * 1024), 2),
        "ai_engine_status": "ONLINE (PyTorch)",
        "cuda_available": torch.cuda.is_available()
    }

@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Returns directory of all registered platform users."""
    return db.query(User).order_by(User.created_at.desc()).all()

@router.get("/audit-logs", response_model=List[AuditLogResponse])
def get_system_audit_logs(
    limit: int = 50,
    admin_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Retrieves immutable audit trail of platform events and user activities."""
    return db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()

@router.get("/system-health")
def get_system_health(admin_user: User = Depends(get_current_admin)):
    """System diagnostic telemetry and resource health."""
    return {
        "status": "HEALTHY",
        "pytorch_version": torch.__version__,
        "cuda_device": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
        "active_services": [
            {"service": "FastAPI REST Gateway", "status": "UP"},
            {"service": "SQLAlchemy Database Engine", "status": "UP"},
            {"service": "PyTorch Vision Neural Network", "status": "UP"},
            {"service": "Multi-Agent Regulatory Coordinator", "status": "UP"},
            {"service": "Private Dashcam Cloud Vault", "status": "UP"}
        ]
    }
