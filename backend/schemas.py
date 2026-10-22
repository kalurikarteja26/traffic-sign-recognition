import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# ── Auth & User Schemas ───────────────────────────────────────────────────────
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    safety_score: int
    storage_used_bytes: int
    storage_quota_bytes: int
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None

# ── Vehicle Schemas ──────────────────────────────────────────────────────────
class VehicleBase(BaseModel):
    reg_number: str
    nickname: Optional[str] = None
    vehicle_type: str = "4-Wheeler Car"
    make_model: Optional[str] = None
    year: Optional[int] = None
    fuel_type: str = "Petrol"
    color: Optional[str] = None
    insurance_expiry: Optional[str] = None
    puc_expiry: Optional[str] = None

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(BaseModel):
    nickname: Optional[str] = None
    vehicle_type: Optional[str] = None
    make_model: Optional[str] = None
    year: Optional[int] = None
    fuel_type: Optional[str] = None
    color: Optional[str] = None
    insurance_expiry: Optional[str] = None
    puc_expiry: Optional[str] = None

class VehicleResponse(VehicleBase):
    id: int
    user_id: int
    created_at: datetime.datetime
    pending_challans_count: Optional[int] = 0
    total_challans_amount: Optional[float] = 0.0
    videos_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)

# ── Challan Schemas ──────────────────────────────────────────────────────────
class ChallanBase(BaseModel):
    challan_number: str
    violation_type: str
    amount: float = 500.0
    violation_date: str
    due_date: Optional[str] = None
    issuing_authority: str = "State Traffic Police"
    state: Optional[str] = "Telangana"
    status: str = "pending"
    payment_url: Optional[str] = "https://echallan.parivahan.gov.in/"
    source: str = "manual_entry"
    notes: Optional[str] = None

class ChallanCreate(ChallanBase):
    vehicle_id: Optional[int] = None

class ChallanUpdate(BaseModel):
    status: Optional[str] = None
    amount: Optional[float] = None
    notes: Optional[str] = None
    state: Optional[str] = None

class ChallanResponse(ChallanBase):
    id: int
    user_id: int
    vehicle_id: Optional[int] = None
    document_path: Optional[str] = None
    created_at: datetime.datetime
    vehicle_reg: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# ── Dashcam Video Schemas ────────────────────────────────────────────────────
class VideoResponse(BaseModel):
    id: int
    user_id: int
    vehicle_id: Optional[int] = None
    title: str
    filename: str
    file_size_bytes: int
    duration_seconds: float
    resolution: str
    upload_date: datetime.datetime
    status: str
    notes: Optional[str] = None
    bookmarks_json: Optional[str] = "[]"
    processed_at: Optional[datetime.datetime] = None
    events_count: Optional[int] = 0
    vehicle_reg: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class BookmarkCreate(BaseModel):
    timestamp_seconds: float
    label: str
    note: Optional[str] = None

# ── Safety Event Schemas ─────────────────────────────────────────────────────
class SafetyEventResponse(BaseModel):
    id: int
    video_id: Optional[int] = None
    user_id: int
    timestamp_seconds: float
    timestamp_formatted: str
    class_id: int
    sign_name: str
    risk_tier: str
    confidence: float
    required_action: str
    bounding_box_json: Optional[str] = None
    snapshot_path: Optional[str] = None
    user_feedback: str
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class EventFeedbackUpdate(BaseModel):
    feedback: str # 'confirmed', 'false_positive'

# ── Traffic Rule & Learning Schemas ──────────────────────────────────────────
class TrafficRuleResponse(BaseModel):
    id: int
    class_id: int
    sign_code: Optional[str] = None
    name: str
    category: str
    risk_tier: str
    required_action: str
    legal_reference: str
    description: Optional[str] = None
    penalty_info: Optional[str] = None
    mistake_avoidance: Optional[str] = None
    icon: str
    canonical_image_path: Optional[str] = None
    image_url: Optional[str] = None
    shape: Optional[str] = None
    color_code: Optional[str] = None
    geometry: Optional[str] = None
    reflectivity: Optional[str] = None
    halt: Optional[str] = None
    pitfall: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class QuizQuestionResponse(BaseModel):
    id: int
    category: str
    question_text: str
    options: List[str]
    correct_option_index: int
    explanation: str
    legal_reference: Optional[str] = "Motor Vehicles Act, 1988"
    penalty_info: Optional[str] = None
    teaching_tip: Optional[str] = None
    reference_rule_id: Optional[int] = None

class QuizSubmit(BaseModel):
    category: str
    answers: List[Dict[str, Any]] # [{"question_id": 1, "selected_option": 2}]

class QuizAttemptResponse(BaseModel):
    id: int
    category: str
    score: int
    total_questions: int
    percentage: float
    passed: bool
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# ── Notification & Audit Schemas ─────────────────────────────────────────────
class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    category: str
    is_read: bool
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    action: str
    details_json: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

# ── Dashboard Summary Schema ─────────────────────────────────────────────────
class DashboardSummary(BaseModel):
    user: UserResponse
    safety_score: int
    vehicles_count: int
    pending_challans_count: int
    pending_challans_amount: float
    videos_count: int
    analyzed_videos_count: int
    safety_events_count: int
    storage_used_bytes: int
    storage_quota_bytes: int
    storage_percent: float
    quiz_average_score: float
    recent_events: List[SafetyEventResponse]
    unread_notifications_count: int


# ── Navigation & Location-Aware Verified Sign Schemas ─────────────────────────
class VerifiedTrafficSignBase(BaseModel):
    sign_code: Optional[str] = None
    rule_class_id: Optional[int] = None
    sign_name: str
    category: str = "Mandatory"
    sign_type: str
    latitude: float
    longitude: float
    altitude_m: Optional[float] = None
    road_name: str
    road_segment: Optional[str] = None
    direction_deg: Optional[float] = None
    direction_cardinal: Optional[str] = None
    corridor_id: Optional[str] = None
    speed_limit: Optional[int] = None
    restriction_details: Optional[str] = None
    validity_conditions: Optional[str] = None
    legal_reference: Optional[str] = "Motor Vehicles Act, 1988 — Section 119"
    penalty_info: Optional[str] = None
    tts_prompt_en: str
    tts_prompt_te: Optional[str] = None
    tts_prompt_hi: Optional[str] = None
    advance_warning_meters: int = 200
    verification_status: str = "VERIFIED"
    source: str = "NHAI / Official State Authority"
    is_active: bool = True
    image_url: Optional[str] = None
    metadata_json: Optional[str] = "{}"

class VerifiedTrafficSignCreate(VerifiedTrafficSignBase):
    pass

class VerifiedTrafficSignResponse(VerifiedTrafficSignBase):
    id: int
    verified_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime
    updated_at: Optional[datetime.datetime] = None

    model_config = ConfigDict(from_attributes=True)

class SignReportCreate(BaseModel):
    sign_id: Optional[int] = None
    report_type: str = "MISSING_SIGN"  # 'MISSING_SIGN', 'INCORRECT_SIGN', 'DAMAGED_SIGN', 'OBSOLETE_SIGN'
    sign_name: Optional[str] = None
    category: str = "Mandatory"
    latitude: float
    longitude: float
    road_name: str
    direction_deg: Optional[float] = None
    suggested_speed_limit: Optional[int] = None
    description: str

class SignReportResponse(SignReportCreate):
    id: int
    user_id: Optional[int] = None
    status: str
    reviewer_notes: Optional[str] = None
    created_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

class RouteMatchRequest(BaseModel):
    user_lat: float
    user_lon: float
    user_heading_deg: Optional[float] = None
    user_speed_kmh: Optional[float] = 0.0
    route_waypoints: Optional[List[List[float]]] = None  # [[lat, lon], ...]
    corridor_tolerance_m: float = 35.0
    heading_tolerance_deg: float = 65.0
    lookahead_meters: float = 3000.0
    warning_thresholds: Optional[List[int]] = None  # [500, 200, 100]

class UpcomingSignAlert(BaseModel):
    sign: VerifiedTrafficSignResponse
    eligible: bool
    distance_m: float
    direct_distance_m: float
    cross_track_m: float
    bearing_diff_deg: float
    eta_seconds: Optional[float] = None
    alert_stage: str  # 'UPCOMING', 'EARLY_500M', 'PRIMARY_200M', 'IMMEDIATE_100M', 'PASSED'
    speech_text: str
    urgency: str  # 'CRITICAL', 'WARNING', 'INFORMATIONAL'
    reason: str

class RouteMatchResponse(BaseModel):
    user_location: Dict[str, Any]
    total_corridor_signs_count: int
    upcoming_alerts: List[UpcomingSignAlert]
    next_alert: Optional[UpcomingSignAlert] = None
    route_status: str  # 'ON_ROUTE', 'OFF_ROUTE', 'STANDBY'
    cross_track_distance_m: float

