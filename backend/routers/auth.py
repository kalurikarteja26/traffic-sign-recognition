import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User, Vehicle, Challan, DashcamVideo, SafetyEvent, QuizAttempt
from backend.schemas import (
    UserCreate, UserLogin, UserResponse, Token,
    UserUpdate, PasswordChange
)
from backend.auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, log_audit_event
)

router = APIRouter(prefix="/auth", tags=["Authentication & User Profile"])

@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    """Registers a new user account with hashed password and generates an access token."""
    existing_user = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    new_user = User(
        email=user_in.email.lower(),
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        phone=user_in.phone,
        role="user",
        safety_score=85
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit_event(db, new_user.id, "USER_SIGNUP", details="User registered account.")
    access_token = create_access_token(data={"sub": str(new_user.id)})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticates a user via JSON body and returns a signed JWT token."""
    user = db.query(User).filter(User.email == login_data.email.lower()).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    log_audit_event(db, user.id, "USER_LOGIN", details="Successful JSON login.")
    access_token = create_access_token(data={"sub": str(user.id)})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """OAuth2 password form compatible login endpoint for Swagger UI."""
    user = db.query(User).filter(User.email == form_data.username.lower()).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Returns the authenticated user's profile and storage metrics."""
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Updates the user's name or contact number."""
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.phone is not None:
        current_user.phone = user_update.phone

    db.commit()
    db.refresh(current_user)
    log_audit_event(db, current_user.id, "PROFILE_UPDATED", details="User updated contact profile.")
    return current_user

@router.post("/change-password")
def change_password(
    pwd_data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Safely updates user password after verifying current password."""
    if not verify_password(pwd_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed."
        )
    current_user.hashed_password = hash_password(pwd_data.new_password)
    db.commit()
    log_audit_event(db, current_user.id, "PASSWORD_CHANGED", details="User changed password.")
    return {"message": "Password changed successfully."}

@router.get("/export-data")
def export_user_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Exports all personal records, vehicles, challans, and quiz results as JSON."""
    vehicles = db.query(Vehicle).filter(Vehicle.user_id == current_user.id).all()
    challans = db.query(Challan).filter(Challan.user_id == current_user.id).all()
    videos = db.query(DashcamVideo).filter(DashcamVideo.user_id == current_user.id).all()
    quizzes = db.query(QuizAttempt).filter(QuizAttempt.user_id == current_user.id).all()

    export_payload = {
        "user_profile": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "phone": current_user.phone,
            "safety_score": current_user.safety_score,
            "created_at": str(current_user.created_at)
        },
        "vehicles": [
            {
                "reg_number": v.reg_number,
                "nickname": v.nickname,
                "type": v.vehicle_type,
                "make_model": v.make_model,
                "year": v.year,
                "fuel_type": v.fuel_type
            }
            for v in vehicles
        ],
        "challans": [
            {
                "challan_number": c.challan_number,
                "violation_type": c.violation_type,
                "amount": c.amount,
                "violation_date": c.violation_date,
                "status": c.status,
                "source": c.source
            }
            for c in challans
        ],
        "dashcam_videos_count": len(videos),
        "quiz_history": [
            {
                "category": q.category,
                "score": f"{q.score}/{q.total_questions}",
                "percentage": q.percentage,
                "date": str(q.created_at)
            }
            for q in quizzes
        ]
    }
    log_audit_event(db, current_user.id, "DATA_EXPORTED", details="User downloaded personal data export.")
    return export_payload

@router.delete("/delete-account")
def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Permanently deletes the user account and associated personal data."""
    user_id = current_user.id
    db.delete(current_user)
    db.commit()
    print(f"[AUDIT] Permanently deleted user #{user_id}")
    return {"message": "User account and all associated personal data have been deleted."}
