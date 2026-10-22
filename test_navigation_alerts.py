"""
test_navigation_alerts.py

Automated Test Suite for the Intelligent Traffic Sign Voice Alert System Using Google Maps.
Tests:
1. Spherical Geospatial Math (Haversine, Bearing, Cross-Track, Along-Track Projection).
2. Opposite Direction Carriage-Way Suppression (180° heading mismatch rejection).
3. Parallel Road Corridor Suppression (Corridor tolerance threshold enforcement).
4. Along-Route Distance Calculation & Order.
5. Speed-Adaptive Advance Warning Distance Expansion (500m / 200m / 100m).
6. Navigation Corridors & Verified Sign Retrieval.
7. Route Matching & Alert Life Cycle (UPCOMING, EARLY_500M, PRIMARY_200M, IMMEDIATE_100M).
8. Off-Route Vehicle Deviation Detection.
9. Crowdsourced Sign Reporting & Uncertainty Flags.
10. Administrative Sign Verification.
"""

import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.services.geospatial import (
    haversine_distance_m,
    calculate_bearing_deg,
    bearing_difference_deg,
    is_heading_aligned,
    cross_track_distance_m,
    along_track_distance_m,
    project_point_onto_polyline,
    compute_route_distance_to_sign,
    calculate_adaptive_warning_thresholds
)

client = TestClient(app)


# ── 1. Geospatial Mathematics Tests ──────────────────────────────────────────
def test_geospatial_haversine_distance():
    """Verify great-circle spherical distance calculation between known coordinates."""
    # Hyderabad Wipro Circle (17.4180, 78.3410) to Waverock (17.4250, 78.3480)
    dist = haversine_distance_m(17.4180, 78.3410, 17.4250, 78.3480)
    # Distance should be approx 1,060 - 1,080 meters
    assert 1000.0 < dist < 1150.0

    # Zero distance test
    assert haversine_distance_m(17.4180, 78.3410, 17.4180, 78.3410) == 0.0


def test_geospatial_bearing():
    """Verify forward azimuth bearing calculation."""
    # Directly North: lat increases, lon stays same
    bearing_north = calculate_bearing_deg(10.0, 78.0, 11.0, 78.0)
    assert abs(bearing_north - 0.0) < 0.1 or abs(bearing_north - 360.0) < 0.1

    # Directly East: lat stays same, lon increases
    bearing_east = calculate_bearing_deg(10.0, 78.0, 10.0, 79.0)
    assert abs(bearing_east - 90.0) < 1.0

    # Northeast (approx 45 degrees)
    bearing_ne = calculate_bearing_deg(17.4180, 78.3410, 17.4250, 78.3480)
    assert 40.0 < bearing_ne < 50.0


def test_bearing_difference_and_alignment():
    """Verify angular difference and direction alignment logic."""
    # 45 deg vs 45 deg -> 0
    assert bearing_difference_deg(45.0, 45.0) == 0.0

    # 10 deg vs 350 deg -> 20 deg
    assert abs(bearing_difference_deg(10.0, 350.0) - 20.0) < 0.01

    # Opposite direction: 45 deg vs 225 deg -> 180 deg
    assert abs(bearing_difference_deg(45.0, 225.0) - 180.0) < 0.01

    # Vehicle heading 45° vs Sign facing 45°: Aligned
    assert is_heading_aligned(45.0, 45.0, tolerance_deg=65.0) is True

    # Vehicle heading 45° vs Sign facing 225° (Opposite): NOT Aligned
    assert is_heading_aligned(45.0, 225.0, tolerance_deg=65.0) is False


def test_cross_track_corridor_rejection_math():
    """Verify cross-track distance identifies perpendicular offset from route centerline."""
    # Segment from (17.4180, 78.3410) to (17.4250, 78.3480)
    # Point directly on segment mid-point
    mid_lat, mid_lon = (17.4180 + 17.4250) / 2.0, (78.3410 + 78.3480) / 2.0
    xt_on = cross_track_distance_m(mid_lat, mid_lon, 17.4180, 78.3410, 17.4250, 78.3480)
    assert xt_on < 2.0  # essentially zero

    # Point offset perpendicularly by ~85 meters
    # Moving latitude up without longitude pushes it off centerline
    xt_offset = cross_track_distance_m(mid_lat + 0.0007, mid_lon, 17.4180, 78.3410, 17.4250, 78.3480)
    assert xt_offset > 45.0


def test_speed_adaptive_warning_thresholds():
    """Verify that high vehicle speed expands advance warning distances."""
    # Standard urban speed (40 km/h) -> default [500, 200, 100]
    thresh_urban = calculate_adaptive_warning_thresholds(40.0, [500, 200, 100])
    assert thresh_urban == [500, 200, 100]

    # Highway speed (90 km/h) -> expanded thresholds
    thresh_highway = calculate_adaptive_warning_thresholds(90.0, [500, 200, 100])
    assert thresh_highway[0] >= 650  # Early warning expanded
    assert thresh_highway[1] >= 280  # Primary warning expanded
    assert thresh_highway[2] >= 140  # Immediate warning expanded

    # Crawl speed (15 km/h) -> tighter thresholds
    thresh_crawl = calculate_adaptive_warning_thresholds(15.0, [500, 200, 100])
    assert thresh_crawl[0] <= 450
    assert thresh_crawl[1] <= 160


# ── 2. Navigation API Endpoints Tests ─────────────────────────────────────────
def test_api_navigation_corridors():
    """Verify API returns pre-mapped Indian corridors with valid waypoints."""
    res = client.get("/api/navigation/corridors")
    assert res.status_code == 200
    corridors = res.json()
    assert len(corridors) >= 4
    corridor_ids = [c["id"] for c in corridors]
    assert "HYD-ORR-GACHIBOWLI" in corridor_ids
    assert "BLR-ECITY-EXPWY" in corridor_ids
    assert "DEL-RING-ROAD" in corridor_ids
    assert "MUM-PUNE-EXPWY" in corridor_ids


def test_api_navigation_signs():
    """Verify verified signs retrieval with legal attributes and multilingual TTS prompts."""
    res = client.get("/api/navigation/signs?corridor_id=HYD-ORR-GACHIBOWLI")
    assert res.status_code == 200
    signs = res.json()
    assert len(signs) >= 8

    # Verify Stop sign presence and required schema fields
    stop_sign = next((s for s in signs if "stop" in s["sign_name"].lower() and "opposite" not in s["sign_name"].lower()), None)
    assert stop_sign is not None
    assert stop_sign["category"] == "Mandatory"
    assert stop_sign["tts_prompt_en"] != ""
    assert stop_sign["tts_prompt_te"] is not None
    assert stop_sign["verification_status"] == "VERIFIED"
    assert "Section 119" in stop_sign["legal_reference"]


# ── 3. Scenario & Edge-Case Rejection Tests ──────────────────────────────────
def test_route_matching_primary_warning_200m():
    """Scenario 1: Vehicle within 200m of Stop Sign receives PRIMARY_200M alert."""
    payload = {
        "user_lat": 17.4180,
        "user_lon": 78.3410,
        "user_heading_deg": 45.0,
        "user_speed_kmh": 40.0,
        "route_waypoints": [
            [17.4180, 78.3410],
            [17.4215, 78.3445],
            [17.4250, 78.3480],
            [17.4290, 78.3520],
            [17.4330, 78.3565]
        ]
    }
    res = client.post("/api/navigation/match-route", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["route_status"] == "ON_ROUTE"
    assert len(data["upcoming_alerts"]) > 0

    next_alert = data["next_alert"]
    assert next_alert is not None
    assert "stop" in next_alert["sign"]["sign_name"].lower()
    assert next_alert["distance_m"] < 250.0
    assert next_alert["alert_stage"] in ["PRIMARY_200M", "IMMEDIATE_100M", "EARLY_500M"]
    assert "Stop sign ahead" in next_alert["speech_text"]
    assert next_alert["urgency"] == "CRITICAL"


def test_opposite_direction_sign_rejection():
    """Scenario 2: Sign facing opposite traffic (Southwest 225°) is REJECTED for Northeast (45°) traffic."""
    # Evaluates the benchmark opposite direction sign seeded at 17.4240, 78.3470 (heading 225°)
    payload = {
        "user_lat": 17.4180,
        "user_lon": 78.3410,
        "user_heading_deg": 45.0,
        "user_speed_kmh": 40.0,
        "route_waypoints": [
            [17.4180, 78.3410],
            [17.4215, 78.3445],
            [17.4250, 78.3480],
            [17.4290, 78.3520]
        ]
    }
    res = client.post("/api/navigation/match-route", json=payload)
    assert res.status_code == 200
    data = res.json()

    # The opposite sign must NOT be in the eligible alerts
    opposite_alert = next((a for a in data["upcoming_alerts"] if "opposite" in a["sign"]["sign_name"].lower()), None)
    assert opposite_alert is None, "Opposite direction sign was not rejected by heading alignment!"


def test_parallel_road_sign_rejection():
    """Scenario 3: Sign located 85m off on parallel service alley is REJECTED by corridor tolerance."""
    # Evaluates benchmark parallel road sign seeded at 17.4255, 78.3465
    payload = {
        "user_lat": 17.4180,
        "user_lon": 78.3410,
        "user_heading_deg": 45.0,
        "user_speed_kmh": 40.0,
        "corridor_tolerance_m": 35.0,
        "route_waypoints": [
            [17.4180, 78.3410],
            [17.4215, 78.3445],
            [17.4250, 78.3480],
            [17.4290, 78.3520]
        ]
    }
    res = client.post("/api/navigation/match-route", json=payload)
    assert res.status_code == 200
    data = res.json()

    parallel_alert = next((a for a in data["upcoming_alerts"] if "internal" in a["sign"]["road_name"].lower() or "alley" in a["sign"]["road_name"].lower()), None)
    assert parallel_alert is None, "Parallel service road sign was not rejected by corridor filter!"


def test_off_route_vehicle_detection():
    """Scenario 4: When vehicle is > 55m away from polyline, route status reports OFF_ROUTE."""
    payload = {
        "user_lat": 17.4500,  # Far away from route
        "user_lon": 78.3100,
        "user_heading_deg": 45.0,
        "user_speed_kmh": 40.0,
        "route_waypoints": [
            [17.4180, 78.3410],
            [17.4215, 78.3445],
            [17.4250, 78.3480]
        ]
    }
    res = client.post("/api/navigation/match-route", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["route_status"] == "OFF_ROUTE"
    assert data["cross_track_distance_m"] > 55.0


def test_unverified_sign_reporting_and_uncertainty():
    """Scenario 5: Driver can report a missing sign, stored as UNVERIFIED_REPORT."""
    report_data = {
        "report_type": "MISSING_SIGN",
        "sign_name": "New Speed Camera 50 km/h",
        "category": "Mandatory",
        "latitude": 17.4280,
        "longitude": 78.3510,
        "road_name": "Financial District Expressway Entry",
        "direction_deg": 45.0,
        "suggested_speed_limit": 50,
        "description": "Newly erected digital radar sign by Cyberabad Police."
    }
    res = client.post("/api/navigation/reports", json=report_data)
    assert res.status_code == 201
    created_report = res.json()
    assert created_report["id"] is not None
    assert created_report["status"] == "PENDING"
    assert created_report["sign_name"] == "New Speed Camera 50 km/h"


def test_admin_sign_verification():
    """Scenario 6: Admin can authenticate and verify an unverified sign."""
    # 1. Create a test unverified sign as a regular driver or unauthenticated user
    create_res = client.post("/api/navigation/signs", json={
        "sign_name": "Test Radar Warning",
        "category": "Mandatory",
        "sign_type": "Speed Limit",
        "latitude": 17.4300,
        "longitude": 78.3500,
        "road_name": "Test Highway",
        "tts_prompt_en": "Test radar warning ahead.",
        "verification_status": "UNVERIFIED_REPORT"
    })
    assert create_res.status_code == 201
    test_sign_id = create_res.json()["id"]
    assert create_res.json()["verification_status"] == "UNVERIFIED_REPORT"

    # 2. Login as admin
    login_res = client.post("/api/auth/login", json={
        "email": "admin@aerovision.ai",
        "password": "admin123"
    })
    assert login_res.status_code == 200
    admin_token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 3. Verify sign via admin endpoint
    verify_res = client.put(f"/api/navigation/signs/{test_sign_id}/verify?verified_status=VERIFIED", headers=headers)
    assert verify_res.status_code == 200
    assert verify_res.json()["verification_status"] == "VERIFIED"
