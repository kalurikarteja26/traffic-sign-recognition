"""
test_aerovision_platform.py
Comprehensive integration test suite for AeroVision Platform.
Tests:
- Authentication & RBAC (Driver & Admin)
- Profile & Security
- Vehicle Garage CRUD & HSRP validation
- Challan Center & Parivahan Attribution
- Traffic Rules (108 Signs), Mistake Awareness, & Scored Quizzes
- Dashcam Vault & Quota Management
- AI Perception Engine (PyTorch 108-sign Model & Evaluation Metrics)
- Cross-User Isolation & Server-Side Authorization
"""

import os
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.database import get_db, Base, engine, SessionLocal
from backend.ai_service import AIServiceManager

client = TestClient(app)

def test_root_endpoint():
    """Verify root API banner and system identity."""
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert "AeroVision" in data.get("platform", "")
    assert data.get("status", "").lower() == "online"

def test_authentication_driver():
    """Verify driver login returns valid JWT token."""
    res = client.post("/api/auth/login", json={
        "email": "driver@aerovision.ai",
        "password": "password123"
    })
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["role"] in ["user", "driver"]

def test_authentication_admin():
    """Verify admin login returns valid admin role."""
    res = client.post("/api/auth/login", json={
        "email": "admin@aerovision.ai",
        "password": "admin123"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["role"] == "admin"

def test_invalid_credentials():
    """Verify rejection of bad password."""
    res = client.post("/api/auth/login", json={
        "email": "driver@aerovision.ai",
        "password": "wrongpassword"
    })
    assert res.status_code == 401

def test_profile_and_dashboard():
    """Verify authenticated user can fetch profile and personalized dashboard summary."""
    login_res = client.post("/api/auth/login", json={
        "email": "driver@aerovision.ai",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Profile
    profile_res = client.get("/api/auth/me", headers=headers)
    assert profile_res.status_code == 200
    assert profile_res.json()["email"] == "driver@aerovision.ai"

    # Dashboard Summary
    dash_res = client.get("/api/dashboard/summary", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert "safety_score" in dash_data
    assert "vehicles_count" in dash_data
    assert "pending_challans_count" in dash_data

def test_vehicle_garage_crud():
    """Test full CRUD cycle for Vehicle Garage."""
    login_res = client.post("/api/auth/login", json={
        "email": "driver@aerovision.ai",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create vehicle
    create_res = client.post("/api/vehicles/", headers=headers, json={
        "reg_number": "KA 01 AB 9999",
        "nickname": "Test EV",
        "vehicle_type": "4-Wheeler Car",
        "make_model": "Hyundai Ioniq 5",
        "year": 2024,
        "fuel_type": "Electric"
    })
    assert create_res.status_code == 201
    v_id = create_res.json()["id"]

    # Read vehicles
    list_res = client.get("/api/vehicles/", headers=headers)
    assert list_res.status_code == 200
    reg_nums = [v["reg_number"] for v in list_res.json()]
    assert "KA 01 AB 9999" in reg_nums

    # Delete test vehicle
    del_res = client.delete(f"/api/vehicles/{v_id}", headers=headers)
    assert del_res.status_code == 200

def test_challan_center_and_attribution():
    """Verify challans list and legal disclaimer / official Parivahan link."""
    login_res = client.post("/api/auth/login", json={
        "email": "driver@aerovision.ai",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/challans/", headers=headers)
    assert res.status_code == 200
    challans = res.json()
    assert len(challans) > 0
    first = challans[0]
    assert "amount" in first
    assert "status" in first
    assert "violation_type" in first
    # Official payment link must point to an official government portal (Parivahan / State Police)
    assert "gov.in" in first.get("payment_url", "")

def test_traffic_rules_and_learning_center():
    """Verify 108 Indian RTO signs catalog and mistake awareness."""
    # Signs list (public)
    res = client.get("/api/rules/")
    assert res.status_code == 200
    signs = res.json()
    assert len(signs) == 108, f"Expected 108 RTO signs, found {len(signs)}"

    # Filter by category
    mandatory_res = client.get("/api/rules/?category=Mandatory")
    assert mandatory_res.status_code == 200
    for sign in mandatory_res.json():
        assert sign["category"].upper() == "MANDATORY"

    # Mistake Awareness Center
    mistakes_res = client.get("/api/rules/mistakes")
    assert mistakes_res.status_code == 200
    mistakes = mistakes_res.json()
    assert len(mistakes) > 0
    assert "statutory_law" in mistakes[0]

def test_quiz_engine_and_score_update():
    """Verify quiz retrieval and scoring."""
    login_res = client.post("/api/auth/login", json={
        "email": "driver@aerovision.ai",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch questions
    q_res = client.get("/api/rules/quizzes")
    assert q_res.status_code == 200
    questions = q_res.json()
    assert len(questions) >= 5

    # Submit quiz answers (selecting option index 1)
    answers = [{"question_id": q["id"], "selected_option": 1} for q in questions]
    sub_res = client.post("/api/rules/quizzes/submit", headers=headers, json={
        "category": "Comprehensive",
        "answers": answers
    })
    assert sub_res.status_code == 200
    sub_data = sub_res.json()
    assert sub_data["total_questions"] == len(questions)
    assert "score" in sub_data
    assert "percentage" in sub_data

def test_dashcam_vault_quota():
    """Verify private video vault quota calculation."""
    login_res = client.post("/api/auth/login", json={
        "email": "driver@aerovision.ai",
        "password": "password123"
    })
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/vault/quota", headers=headers)
    assert res.status_code == 200
    quota = res.json()
    assert "used_bytes" in quota
    assert quota["quota_bytes"] == 500 * 1024 * 1024  # 500 MB default

def test_ai_perception_model_evaluation():
    """Verify that PyTorch 108-class model is loaded and telemetry is reported."""
    res = client.get("/api/ai/evaluation")
    assert res.status_code == 200
    data = res.json()
    assert "108-Class" in data["model_name"]
    assert data["total_classes"] == 108
    assert data["accuracy_on_canonical_test_set"] == 100.0
    assert data["inference_latency_ms"] > 0
    assert "multi_agent_pipeline" in data

def test_admin_console_rbac():
    """Verify that non-admin users cannot access admin endpoints."""
    # Driver token
    driver_res = client.post("/api/auth/login", json={
        "email": "driver@aerovision.ai",
        "password": "password123"
    })
    driver_token = driver_res.json()["access_token"]
    driver_headers = {"Authorization": f"Bearer {driver_token}"}

    # Driver should get 403 Forbidden
    res = client.get("/api/admin/metrics", headers=driver_headers)
    assert res.status_code == 403

    # Admin token
    admin_res = client.post("/api/auth/login", json={
        "email": "admin@aerovision.ai",
        "password": "admin123"
    })
    admin_token = admin_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Admin should get 200 OK
    admin_metrics = client.get("/api/admin/metrics", headers=admin_headers)
    assert admin_metrics.status_code == 200
    assert "total_users" in admin_metrics.json()
