from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, Vehicle, Challan, DashcamVideo, SafetyEvent, QuizAttempt, Notification
from backend.schemas import DashboardSummary, UserResponse, SafetyEventResponse
from backend.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["User Dashboard"])

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Computes comprehensive dashboard telemetry across vehicles, challans, videos, and compliance."""
    vehicles_count = db.query(Vehicle).filter(Vehicle.user_id == current_user.id).count()

    challans = db.query(Challan).filter(Challan.user_id == current_user.id).all()
    pending_challans = [c for c in challans if c.status == "pending"]
    pending_amount = sum(c.amount for c in pending_challans)

    videos = db.query(DashcamVideo).filter(DashcamVideo.user_id == current_user.id).all()
    analyzed_videos = [v for v in videos if v.status == "analyzed"]

    events = db.query(SafetyEvent).filter(SafetyEvent.user_id == current_user.id).order_by(SafetyEvent.created_at.desc()).all()
    recent_events = events[:5]

    quizzes = db.query(QuizAttempt).filter(QuizAttempt.user_id == current_user.id).all()
    avg_quiz_score = (sum(q.percentage for q in quizzes) / max(1, len(quizzes))) if quizzes else 0.0

    unread_notifs = db.query(Notification).filter(Notification.user_id == current_user.id, Notification.is_read == False).count()

    storage_used = current_user.storage_used_bytes
    storage_quota = current_user.storage_quota_bytes
    storage_pct = round((storage_used / max(1, storage_quota)) * 100.0, 1)

    return DashboardSummary(
        user=UserResponse.model_validate(current_user),
        safety_score=current_user.safety_score,
        vehicles_count=vehicles_count,
        pending_challans_count=len(pending_challans),
        pending_challans_amount=pending_amount,
        videos_count=len(videos),
        analyzed_videos_count=len(analyzed_videos),
        safety_events_count=len(events),
        storage_used_bytes=storage_used,
        storage_quota_bytes=storage_quota,
        storage_percent=min(100.0, storage_pct),
        quiz_average_score=round(avg_quiz_score, 1),
        recent_events=[SafetyEventResponse.model_validate(e) for e in recent_events],
        unread_notifications_count=unread_notifs
    )
