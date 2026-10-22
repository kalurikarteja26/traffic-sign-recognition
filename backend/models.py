import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, BigInteger
)
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    role = Column(String(50), default="user")  # 'user', 'admin'
    safety_score = Column(Integer, default=85) # 0 to 100
    storage_used_bytes = Column(BigInteger, default=0)
    storage_quota_bytes = Column(BigInteger, default=524288000) # 500 MB default
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    vehicles = relationship("Vehicle", back_populates="owner", cascade="all, delete-orphan")
    challans = relationship("Challan", back_populates="user", cascade="all, delete-orphan")
    videos = relationship("DashcamVideo", back_populates="user", cascade="all, delete-orphan")
    safety_events = relationship("SafetyEvent", back_populates="user", cascade="all, delete-orphan")
    quiz_attempts = relationship("QuizAttempt", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    reg_number = Column(String(50), nullable=False, index=True) # e.g. 'KA-01-AB-1234'
    nickname = Column(String(100), nullable=True) # e.g. 'Family Sedan'
    vehicle_type = Column(String(50), default="4-Wheeler Car") # '4-Wheeler Car', '2-Wheeler Motorcycle', 'Electric Vehicle', 'Commercial / Truck'
    make_model = Column(String(100), nullable=True) # e.g. 'Hyundai Creta'
    year = Column(Integer, nullable=True)
    fuel_type = Column(String(50), default="Petrol") # 'Petrol', 'Diesel', 'Electric', 'CNG'
    color = Column(String(50), nullable=True)
    insurance_expiry = Column(String(50), nullable=True)
    puc_expiry = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="vehicles")
    challans = relationship("Challan", back_populates="vehicle", cascade="all, delete-orphan")
    videos = relationship("DashcamVideo", back_populates="vehicle")


class Challan(Base):
    __tablename__ = "challans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True, index=True)
    challan_number = Column(String(100), nullable=False, index=True)
    violation_type = Column(String(200), nullable=False) # e.g. 'Speed Limit Violation', 'Red Light Jumping'
    amount = Column(Float, nullable=False, default=500.0)
    violation_date = Column(String(50), nullable=False) # e.g. '2026-10-15'
    due_date = Column(String(50), nullable=True)
    issuing_authority = Column(String(150), default="State Traffic Police") # e.g. 'Delhi Traffic Police'
    state = Column(String(100), default="Telangana", index=True) # e.g. 'Telangana', 'Andhra Pradesh', 'Delhi', 'Karnataka'
    status = Column(String(50), default="pending") # 'pending', 'paid', 'disputed'
    payment_url = Column(String(500), default="https://echallan.parivahan.gov.in/")
    document_path = Column(String(500), nullable=True) # local path or filename
    source = Column(String(50), default="manual_entry") # 'manual_entry', 'document_upload', 'verified_record'
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="challans")
    vehicle = relationship("Vehicle", back_populates="challans")


class DashcamVideo(Base):
    __tablename__ = "dashcam_videos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(BigInteger, default=0)
    duration_seconds = Column(Float, default=0.0)
    resolution = Column(String(50), default="1920x1080")
    upload_date = Column(DateTime, default=datetime.datetime.utcnow)
    status = Column(String(50), default="uploaded") # 'uploaded', 'processing', 'analyzed', 'failed'
    notes = Column(Text, nullable=True)
    bookmarks_json = Column(Text, default="[]")
    processed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="videos")
    vehicle = relationship("Vehicle", back_populates="videos")
    safety_events = relationship("SafetyEvent", back_populates="video", cascade="all, delete-orphan")


class SafetyEvent(Base):
    __tablename__ = "safety_events"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("dashcam_videos.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    timestamp_seconds = Column(Float, default=0.0)
    timestamp_formatted = Column(String(50), default="00:00")
    class_id = Column(Integer, nullable=False)
    sign_name = Column(String(200), nullable=False)
    risk_tier = Column(String(50), default="INFORMATIONAL") # 'CRITICAL', 'WARNING', 'INFORMATIONAL'
    confidence = Column(Float, default=0.0)
    required_action = Column(Text, nullable=False)
    bounding_box_json = Column(Text, nullable=True) # [x, y, w, h]
    snapshot_path = Column(String(500), nullable=True)
    user_feedback = Column(String(50), default="unreviewed") # 'unreviewed', 'confirmed', 'false_positive'
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    video = relationship("DashcamVideo", back_populates="safety_events")
    user = relationship("User", back_populates="safety_events")


class TrafficRule(Base):
    __tablename__ = "traffic_rules"

    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, unique=True, index=True, nullable=False) # 0 to 107
    name = Column(String(200), nullable=False, index=True)
    category = Column(String(100), default="Mandatory") # 'Mandatory', 'Cautionary', 'Informational'
    risk_tier = Column(String(50), default="INFORMATIONAL")
    required_action = Column(Text, nullable=False)
    legal_reference = Column(String(255), default="Motor Vehicles Act, 1988")
    description = Column(Text, nullable=True)
    penalty_info = Column(String(255), nullable=True)
    mistake_avoidance = Column(Text, nullable=True)
    icon = Column(String(50), default="ℹ️")
    canonical_image_path = Column(String(500), nullable=True)


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(100), default="Traffic Signs") # 'Traffic Signs', 'Road Rules', 'Defensive Driving', 'Penalties'
    question_text = Column(Text, nullable=False)
    options_json = Column(Text, nullable=False) # JSON list of strings
    correct_option_index = Column(Integer, nullable=False)
    explanation = Column(Text, nullable=False)
    legal_reference = Column(String(255), nullable=True)
    penalty_info = Column(String(255), nullable=True)
    teaching_tip = Column(Text, nullable=True)
    reference_rule_id = Column(Integer, nullable=True)


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    category = Column(String(100), default="Traffic Signs")
    score = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    percentage = Column(Float, nullable=False)
    passed = Column(Boolean, default=False)
    answers_json = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="quiz_attempts")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), default="system") # 'challan', 'video', 'safety', 'system'
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False) # e.g. 'USER_LOGIN', 'VIDEO_UPLOAD', 'CHALLAN_CREATED'
    details_json = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="audit_logs")


class VerifiedTrafficSign(Base):
    __tablename__ = "verified_traffic_signs"

    id = Column(Integer, primary_key=True, index=True)
    sign_code = Column(String(50), nullable=True, index=True)  # e.g. 'IRC67-M01'
    rule_class_id = Column(Integer, nullable=True, index=True) # Linked to 108 RTO classes
    sign_name = Column(String(200), nullable=False, index=True)
    category = Column(String(100), default="Mandatory", index=True) # 'Mandatory', 'Cautionary', 'Informational'
    sign_type = Column(String(100), nullable=False) # e.g. 'Speed Limit', 'Stop Sign', 'School Zone'
    
    # Precise Geospatial Attributes
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    altitude_m = Column(Float, nullable=True)
    road_name = Column(String(200), nullable=False, index=True)
    road_segment = Column(String(200), nullable=True) # e.g. 'Outer Ring Road Km 14-16'
    direction_deg = Column(Float, nullable=True) # 0-360 degrees heading where sign is facing traffic
    direction_cardinal = Column(String(50), nullable=True) # e.g. 'Northbound', 'Eastbound'
    corridor_id = Column(String(100), nullable=True, index=True) # e.g. 'HYD-ORR-01', 'BLR-ECITY-02'

    # Legal Restriction & Regulatory Rules
    speed_limit = Column(Integer, nullable=True) # e.g. 40, 50, 80 km/h
    restriction_details = Column(Text, nullable=True)
    validity_conditions = Column(Text, nullable=True) # e.g. 'All days 24x7' or 'Mon-Fri 08:00-16:00'
    legal_reference = Column(String(255), default="Motor Vehicles Act, 1988 — Section 119")
    penalty_info = Column(String(255), nullable=True)
    
    # Audio Alert & TTS Prompts
    tts_prompt_en = Column(Text, nullable=False)
    tts_prompt_te = Column(Text, nullable=True)
    tts_prompt_hi = Column(Text, nullable=True)
    advance_warning_meters = Column(Integer, default=200) # Recommended trigger point

    # Verification & Trust Metadata
    verification_status = Column(String(50), default="VERIFIED", index=True) # 'VERIFIED', 'UNVERIFIED_REPORT', 'EXPERIMENTAL_DETECTION'
    source = Column(String(150), default="NHAI / Official State Authority")
    is_active = Column(Boolean, default=True, index=True)
    verified_at = Column(DateTime, default=datetime.datetime.utcnow)
    image_url = Column(String(500), nullable=True)
    metadata_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Relationships
    reports = relationship("SignReport", back_populates="sign", cascade="all, delete-orphan")


class SignReport(Base):
    __tablename__ = "sign_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    sign_id = Column(Integer, ForeignKey("verified_traffic_signs.id"), nullable=True, index=True)
    report_type = Column(String(50), nullable=False) # 'MISSING_SIGN', 'INCORRECT_SIGN', 'DAMAGED_SIGN', 'OBSOLETE_SIGN'
    sign_name = Column(String(200), nullable=True)
    category = Column(String(100), default="Mandatory")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    road_name = Column(String(200), nullable=False)
    direction_deg = Column(Float, nullable=True)
    suggested_speed_limit = Column(Integer, nullable=True)
    description = Column(Text, nullable=False)
    status = Column(String(50), default="PENDING", index=True) # 'PENDING', 'APPROVED', 'REJECTED'
    reviewer_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    sign = relationship("VerifiedTrafficSign", back_populates="reports")

