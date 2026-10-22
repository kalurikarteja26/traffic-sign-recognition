"""
backend/routers/navigation.py

Intelligent Location-Aware Navigation & Traffic Sign Voice Alert API.
Handles GPS route-matching, verified sign queries, along-track distance calculation,
corridor filtering, duplicate-suppressed voice prompt generation, and crowd-sourced sign reporting.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from backend.database import get_db
from backend.models import User, VerifiedTrafficSign, SignReport, TrafficRule
from backend.schemas import (
    VerifiedTrafficSignBase,
    VerifiedTrafficSignCreate,
    VerifiedTrafficSignResponse,
    SignReportCreate,
    SignReportResponse,
    RouteMatchRequest,
    RouteMatchResponse,
    UpcomingSignAlert
)
from backend.auth import get_current_user, get_optional_user
from backend.services.geospatial import (
    haversine_distance_m,
    compute_route_distance_to_sign,
    project_point_onto_polyline,
    calculate_adaptive_warning_thresholds
)

router = APIRouter(prefix="/navigation", tags=["Navigation & Location-Aware Voice Alerts"])


# ── Pre-mapped Verified Corridors for Realistic Indian Roadway Testing ────────
PREDEFINED_CORRIDORS = [
    {
        "id": "HYD-ORR-GACHIBOWLI",
        "name": "Hyderabad — Financial District to Outer Ring Road (ORR)",
        "city": "Hyderabad, Telangana",
        "center": {"lat": 17.4225, "lon": 78.3482},
        "description": "High-density tech corridor with 40 km/h school zones, 80 km/h expressway limits, and mandatory intersection halts.",
        "waypoints": [
            [17.4180, 78.3410],  # Wipro Circle
            [17.4215, 78.3445],  # Financial District Road
            [17.4250, 78.3480],  # Waverock Junction
            [17.4290, 78.3520],  # Nanakramguda Toll Access
            [17.4330, 78.3565],  # ORR Entry Ramp Km 15
            [17.4375, 78.3610],  # Gachibowli Interchange
            [17.4420, 78.3660]   # Hitec City Arterial Merge
        ]
    },
    {
        "id": "BLR-ECITY-EXPWY",
        "name": "Bengaluru — Electronic City Elevated Expressway to Silk Board",
        "city": "Bengaluru, Karnataka",
        "center": {"lat": 12.8710, "lon": 77.6530},
        "description": "Elevated rapid transit artery with strict 80 km/h speed enforcement, heavy vehicle lane restrictions, and toll approaches.",
        "waypoints": [
            [12.8450, 77.6650],  # Electronic City Phase 1 Toll Entry
            [12.8620, 77.6520],  # Kudlu Gate Flyover Section
            [12.8790, 77.6400],  # Singasandra Mid-Point
            [12.8960, 77.6310],  # Bommanahalli Curve
            [12.9175, 77.6230]   # Silk Board Junction Ramp
        ]
    },
    {
        "id": "MUM-PUNE-EXPWY",
        "name": "Mumbai-Pune Expressway — Khalapur to Khandala Ghat",
        "city": "Maharashtra",
        "center": {"lat": 18.7750, "lon": 73.3420},
        "description": "Mountainous expressway corridor with steep gradients, compulsory low-gear zones, and sharp hairpin curves.",
        "waypoints": [
            [18.8200, 73.2950],  # Khalapur Toll Plaza
            [18.7980, 73.3150],  # Bhor Ghat Ascent
            [18.7750, 73.3420],  # Amrutanjan Bridge Descent
            [18.7520, 73.3680],  # Khandala Bypass
            [18.7400, 73.3850]   # Lonavala Exit
        ]
    },
    {
        "id": "DEL-RING-ROAD",
        "name": "Delhi — Inner Ring Road (AIIMS to DND Flyway)",
        "city": "New Delhi",
        "center": {"lat": 28.5720, "lon": 77.2280},
        "description": "High-volume capital arterial with 50 km/h urban speed limits, AI zebra crossing enforcement, and bus priority lanes.",
        "waypoints": [
            [28.5670, 77.2100],  # AIIMS Intersection
            [28.5700, 77.2250],  # South Extension Underpass
            [28.5740, 77.2430],  # Lajpat Nagar Flyover
            [28.5790, 77.2610],  # Ashram Chowk
            [28.5830, 77.2780]   # DND Flyway Entry
        ]
    }
]


@router.get("/corridors")
def get_predefined_corridors():
    """Returns curated Indian road corridors with real waypoints for immediate navigation testing."""
    return PREDEFINED_CORRIDORS


@router.get("/signs", response_model=List[VerifiedTrafficSignResponse])
def list_verified_signs(
    min_lat: Optional[float] = None,
    max_lat: Optional[float] = None,
    min_lon: Optional[float] = None,
    max_lon: Optional[float] = None,
    corridor_id: Optional[str] = None,
    category: Optional[str] = None,
    verification_status: Optional[str] = None,
    active_only: bool = True,
    limit: int = Query(default=250, le=500),
    db: Session = Depends(get_db)
):
    """
    Retrieves verified traffic signs filtered by geographic bounding box,
    corridor ID, category, or verification status.
    """
    query = db.query(VerifiedTrafficSign)

    if active_only:
        query = query.filter(VerifiedTrafficSign.is_active == True)

    if corridor_id:
        query = query.filter(VerifiedTrafficSign.corridor_id == corridor_id)

    if category:
        query = query.filter(VerifiedTrafficSign.category.ilike(category))

    if verification_status:
        query = query.filter(VerifiedTrafficSign.verification_status == verification_status)

    if min_lat is not None and max_lat is not None and min_lon is not None and max_lon is not None:
        query = query.filter(
            VerifiedTrafficSign.latitude >= min_lat,
            VerifiedTrafficSign.latitude <= max_lat,
            VerifiedTrafficSign.longitude >= min_lon,
            VerifiedTrafficSign.longitude <= max_lon
        )

    return query.limit(limit).all()


@router.get("/signs/{sign_id}", response_model=VerifiedTrafficSignResponse)
def get_sign_details(sign_id: int, db: Session = Depends(get_db)):
    """Retrieves full details, legal statutory penalties, and TTS prompts for a single verified sign."""
    sign = db.query(VerifiedTrafficSign).filter(VerifiedTrafficSign.id == sign_id).first()
    if not sign:
        raise HTTPException(status_code=404, detail="Traffic sign not found")
    return sign


@router.post("/signs", response_model=VerifiedTrafficSignResponse, status_code=status.HTTP_201_CREATED)
def create_or_report_sign(
    payload: VerifiedTrafficSignCreate,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """
    Adds a new traffic sign. Admin accounts can insert VERIFIED signs directly.
    Regular drivers submit signs as UNVERIFIED_REPORT pending authority validation.
    """
    is_admin = current_user and current_user.role == "admin"
    status_val = payload.verification_status if is_admin else "UNVERIFIED_REPORT"
    source_val = payload.source if is_admin else (
        f"Driver Crowdsourced Report ({current_user.email if current_user else 'Anonymous User'})"
    )

    sign = VerifiedTrafficSign(
        sign_code=payload.sign_code,
        rule_class_id=payload.rule_class_id,
        sign_name=payload.sign_name,
        category=payload.category,
        sign_type=payload.sign_type,
        latitude=payload.latitude,
        longitude=payload.longitude,
        altitude_m=payload.altitude_m,
        road_name=payload.road_name,
        road_segment=payload.road_segment,
        direction_deg=payload.direction_deg,
        direction_cardinal=payload.direction_cardinal,
        corridor_id=payload.corridor_id,
        speed_limit=payload.speed_limit,
        restriction_details=payload.restriction_details,
        validity_conditions=payload.validity_conditions,
        legal_reference=payload.legal_reference,
        penalty_info=payload.penalty_info,
        tts_prompt_en=payload.tts_prompt_en,
        tts_prompt_te=payload.tts_prompt_te,
        tts_prompt_hi=payload.tts_prompt_hi,
        advance_warning_meters=payload.advance_warning_meters,
        verification_status=status_val,
        source=source_val,
        is_active=payload.is_active,
        image_url=payload.image_url,
        metadata_json=payload.metadata_json or "{}"
    )
    db.add(sign)
    db.commit()
    db.refresh(sign)
    return sign


@router.put("/signs/{sign_id}/verify", response_model=VerifiedTrafficSignResponse)
def verify_sign(
    sign_id: int,
    verified_status: str = Query("VERIFIED", pattern="^(VERIFIED|UNVERIFIED_REPORT|EXPERIMENTAL_DETECTION)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin-only endpoint to officially verify or reclassify a traffic sign record."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Administrative privileges required to verify signs")

    sign = db.query(VerifiedTrafficSign).filter(VerifiedTrafficSign.id == sign_id).first()
    if not sign:
        raise HTTPException(status_code=404, detail="Traffic sign not found")

    sign.verification_status = verified_status
    db.commit()
    db.refresh(sign)
    return sign


@router.post("/reports", response_model=SignReportResponse, status_code=status.HTTP_201_CREATED)
def submit_sign_report(
    report_in: SignReportCreate,
    current_user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    """Enables drivers to report missing, incorrect, damaged, or obsolete road signs."""
    report = SignReport(
        user_id=current_user.id if current_user else None,
        sign_id=report_in.sign_id,
        report_type=report_in.report_type,
        sign_name=report_in.sign_name,
        category=report_in.category,
        latitude=report_in.latitude,
        longitude=report_in.longitude,
        road_name=report_in.road_name,
        direction_deg=report_in.direction_deg,
        suggested_speed_limit=report_in.suggested_speed_limit,
        description=report_in.description,
        status="PENDING"
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/reports", response_model=List[SignReportResponse])
def list_sign_reports(
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to inspect pending community sign reports."""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Administrative privileges required")

    q = db.query(SignReport)
    if status_filter:
        q = q.filter(SignReport.status == status_filter)
    return q.order_by(SignReport.created_at.desc()).limit(100).all()


@router.post("/quick-pin-test-sign", response_model=VerifiedTrafficSignResponse)
def quick_pin_test_sign(
    lat: float = Query(..., description="User current latitude"),
    lon: float = Query(..., description="User current longitude"),
    heading_deg: float = Query(0.0, description="User current heading in degrees"),
    sign_type: str = Query("Stop Sign", description="Sign type to pin ahead"),
    distance_ahead_m: float = Query(180.0, description="Meters ahead to pin sign"),
    db: Session = Depends(get_db)
):
    """
    Convenience test utility for live handheld devices:
    Pins an active verified traffic sign exactly distance_ahead_m ahead along the device's travel vector.
    """
    import math
    R = 6371000.0
    d = max(30.0, min(500.0, distance_ahead_m))
    brng = math.radians(heading_deg)
    lat1 = math.radians(lat)
    lon1 = math.radians(lon)
    lat2 = math.asin(math.sin(lat1)*math.cos(d/R) + math.cos(lat1)*math.sin(d/R)*math.cos(brng))
    lon2 = lon1 + math.atan2(math.sin(brng)*math.sin(d/R)*math.cos(lat1), math.cos(d/R)-math.sin(lat1)*math.sin(lat2))
    sign_lat = round(math.degrees(lat2), 6)
    sign_lon = round(math.degrees(lon2), 6)

    # Determine sign configuration
    if "40" in sign_type or "speed" in sign_type.lower():
        name = "Speed Limit 40 km/h"
        cat = "Mandatory"
        limit = 40
        en_prompt = "Speed limit ahead. Maximum permitted speed is 40 kilometres per hour."
        te_prompt = "ముందు వేగ పరిమితి ఉంది. గరిష్ట అనుమతించబడిన వేగం గంటకు నలభై కిలోమీటర్లు."
        hi_prompt = "आगे गति सीमा है। अधिकतम अनुमत गति चालीस किलोमीटर प्रति घंटा है।"
    else:
        name = "Stop Sign"
        cat = "Mandatory"
        limit = None
        en_prompt = "Warning. Stop sign ahead. Prepare to stop."
        te_prompt = "హెచ్చరిక. ముందు స్టాప్ సంకేతం ఉంది. ఆగడానికి సిద్ధంగా ఉండండి."
        hi_prompt = "चेतावनी। आगे स्टॉप साइन है। रुकने के लिए तैयार रहें।"

    pin_sign = VerifiedTrafficSign(
        sign_code=f"DEV-TEST-{int(abs(lat*1000)%9000):04d}",
        rule_class_id=0 if limit is None else 14,
        sign_name=name,
        category=cat,
        sign_type="Stop Sign" if limit is None else "Speed Limit",
        latitude=sign_lat,
        longitude=sign_lon,
        road_name="Current Travel Roadway",
        road_segment=f"Live Handheld Sector ({int(d)}m ahead)",
        direction_deg=round(heading_deg, 1),
        direction_cardinal="Ahead",
        speed_limit=limit,
        tts_prompt_en=en_prompt,
        tts_prompt_te=te_prompt,
        tts_prompt_hi=hi_prompt,
        advance_warning_meters=int(d),
        verification_status="VERIFIED",
        source="Live Device Pin Test",
        is_active=True,
        metadata_json="{}"
    )
    db.add(pin_sign)
    db.commit()
    db.refresh(pin_sign)
    return pin_sign


@router.post("/match-route", response_model=RouteMatchResponse)
def match_route_and_get_alerts(
    req: RouteMatchRequest,
    db: Session = Depends(get_db)
):
    """
    Core Geospatial Matching & Voice Alert Arbitration Engine:
    1. Projects vehicle and signs onto active route polyline.
    2. Enforces corridor width (e.g. 35m) to reject parallel road signs.
    3. Enforces heading alignment to reject opposite carriageway signs.
    4. Computes true along-route distance in advance.
    5. Applies speed-adaptive warning distance thresholds (500m, 200m, 100m).
    6. Returns prioritized, non-overlapping upcoming alert queue.
    """
    waypoints = [tuple(p) for p in req.route_waypoints] if req.route_waypoints else []

    # Determine user off-route status
    if len(waypoints) >= 2:
        user_proj = project_point_onto_polyline(req.user_lat, req.user_lon, waypoints)
        user_cross_track = user_proj["min_distance_m"]
        route_status = "ON_ROUTE" if user_cross_track <= 55.0 else "OFF_ROUTE"
    else:
        user_cross_track = 0.0
        route_status = "STANDBY"

    # Define bounding box for candidate retrieval around vehicle AND route
    lat_margin = 0.05  # ~5.5 km
    lon_margin = 0.05
    all_lats = [req.user_lat]
    all_lons = [req.user_lon]
    if waypoints:
        all_lats.extend([p[0] for p in waypoints])
        all_lons.extend([p[1] for p in waypoints])

    min_lat, max_lat = min(all_lats) - lat_margin, max(all_lats) + lat_margin
    min_lon, max_lon = min(all_lons) - lon_margin, max(all_lons) + lon_margin

    # Query active candidate signs
    candidate_signs = db.query(VerifiedTrafficSign).filter(
        VerifiedTrafficSign.is_active == True,
        VerifiedTrafficSign.latitude >= min_lat,
        VerifiedTrafficSign.latitude <= max_lat,
        VerifiedTrafficSign.longitude >= min_lon,
        VerifiedTrafficSign.longitude <= max_lon
    ).all()

    speed_kmh = req.user_speed_kmh or 0.0
    speed_ms = speed_kmh / 3.6 if speed_kmh > 0 else 0.0
    adaptive_thresholds = calculate_adaptive_warning_thresholds(speed_kmh, req.warning_thresholds)
    early_thresh, primary_thresh, immediate_thresh = adaptive_thresholds

    upcoming_alerts: List[UpcomingSignAlert] = []

    for sign in candidate_signs:
        eval_result = compute_route_distance_to_sign(
            user_lat=req.user_lat,
            user_lon=req.user_lon,
            user_heading_deg=req.user_heading_deg,
            sign_lat=sign.latitude,
            sign_lon=sign.longitude,
            sign_direction_deg=sign.direction_deg,
            route_waypoints=waypoints,
            corridor_tolerance_m=req.corridor_tolerance_m,
            heading_tolerance_deg=req.heading_tolerance_deg
        )

        if not eval_result["eligible"]:
            continue

        along_dist = eval_result["distance_m"]
        if along_dist > req.lookahead_meters:
            continue

        # Compute Estimated Time of Arrival (ETA)
        eta_sec = (along_dist / speed_ms) if speed_ms > 1.0 else None

        # Determine Alert Stage based on thresholds
        if along_dist <= immediate_thresh:
            stage = "IMMEDIATE_100M"
        elif along_dist <= primary_thresh:
            stage = "PRIMARY_200M"
        elif along_dist <= early_thresh:
            stage = "EARLY_500M"
        else:
            stage = "UPCOMING"

        # Determine Urgency
        is_critical = (
            sign.category == "Mandatory" or
            "stop" in sign.sign_name.lower() or
            "no entry" in sign.sign_name.lower() or
            sign.speed_limit is not None or
            stage == "IMMEDIATE_100M"
        )
        urgency = "CRITICAL" if is_critical else ("WARNING" if sign.category == "Cautionary" else "INFORMATIONAL")

        # Synthesize clear, authoritative speech text
        if sign.tts_prompt_en:
            speech = sign.tts_prompt_en
        elif sign.speed_limit:
            speech = f"Speed limit ahead. Maximum permitted speed is {sign.speed_limit} kilometres per hour."
        else:
            prefix = "Warning." if is_critical else "Caution."
            speech = f"{prefix} {sign.sign_name} ahead. Adjust driving accordingly."

        # Add distance prefix for immediate/primary calls
        if stage == "IMMEDIATE_100M" and along_dist > 15:
            speech = f"Immediate alert: {speech}"

        alert_item = UpcomingSignAlert(
            sign=sign,
            eligible=True,
            distance_m=round(along_dist, 1),
            direct_distance_m=round(eval_result["direct_distance_m"], 1),
            cross_track_m=round(eval_result["cross_track_m"], 1),
            bearing_diff_deg=round(eval_result["bearing_diff_deg"], 1),
            eta_seconds=round(eta_sec, 1) if eta_sec else None,
            alert_stage=stage,
            speech_text=speech,
            urgency=urgency,
            reason=eval_result["reason"]
        )
        upcoming_alerts.append(alert_item)

    # Sort upcoming alerts by closest along-route distance first
    upcoming_alerts.sort(key=lambda a: a.distance_m)

    next_alert = upcoming_alerts[0] if upcoming_alerts else None

    return RouteMatchResponse(
        user_location={
            "lat": req.user_lat,
            "lon": req.user_lon,
            "heading_deg": req.user_heading_deg,
            "speed_kmh": req.user_speed_kmh
        },
        total_corridor_signs_count=len(upcoming_alerts),
        upcoming_alerts=upcoming_alerts,
        next_alert=next_alert,
        route_status=route_status,
        cross_track_distance_m=round(user_cross_track, 1)
    )
