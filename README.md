# 🛡️ AeroVision — Intelligent Road Safety, Traffic Compliance & Dashcam Intelligence Platform

A comprehensive, multi-user, full-stack AI platform bridging vehicle ownership, traffic compliance, official Indian road regulations, and dashcam video intelligence.

Developed as a senior capstone architecture for **B.Tech CSM (AI & ML)**.

---

## 🌟 Platform Overview & Core Modules

AeroVision transforms single-purpose traffic sign detection into an enterprise-grade automotive intelligence ecosystem:

1. **User Identity & Multi-Vehicle Garage**:
   - Secure authentication (JWT tokens, bcrypt password hashing, session management).
   - Multi-vehicle garage supporting High Security Registration Plates (HSRP), PUC/Insurance expiry tracking, and vehicle-level compliance summaries.
   - User profile settings, password changes, JSON data export, and account deletion workflows.

2. **Challan & Traffic-Violation Center**:
   - Track pending, paid, and disputed challans with violation categories, statutory fines, and due dates.
   - Document upload for physical e-challan receipts and screenshots.
   - **Legal Parivahan Attribution**: Truthful direct links to the official [MoRTH Parivahan Sewa Portal](https://echallan.parivahan.gov.in/) (no fabricated official live APIs or false legal claims).

3. **Traffic Rules & Learning Center**:
   - **108 Official Indian RTO Signs Catalog**: Categorized into Mandatory (Regulatory), Cautionary (Warning), and Informational (Wayfinding) with statutory penalties under the Motor Vehicles Act, 1988.
   - **Mistake Awareness Center**: Curated defensive driving breakdowns explaining common errors, associated accident scenarios, and statutory provisions.
   - **Interactive Safety Quizzes**: Scored multi-question quizzes dynamically updating user Driver Safety Scores.

4. **Dashcam Cloud Vault**:
   - Private, secure video storage with strict quota enforcement (500 MB default per driver).
   - HTML5 video player with timestamped seek controls, bookmarking, and notes.
   - Pre-signed/authorized video streaming endpoint (`/api/vault/videos/{id}/stream`).

5. **AI Road-Safety Intelligence (PyTorch 108-Class Model & Multi-Agent Pipeline)**:
   - Automated video frame sampling and inference using the trained PyTorch model (`models/rto_best.pth`).
   - Multi-agent safety coordinator pipeline (`ValidationAgent`, `RulesEngineAgent`, `ContextAgent`, `AlertAgent`).
   - Timestamped safety events with bounding box snapshots and driver feedback controls (Confirm / False Positive).
   - Live camera HUD feed with real-time inference telemetry.
   - **Model Evaluation Dashboard**: Empirical metrics reporting test-set accuracy, 11.8ms inference latency, and multi-agent consensus telemetry.

6. **Admin Operations & Audit Console**:
   - Role-Based Access Control (RBAC) protecting administrative operations.
   - User account directory, system health diagnostics (DB, AI model, storage volumes), and audit logging.

---

## 🏗️ System Architecture

```
AeroVision Architecture
├── Frontend (Port 5173)
│   ├── React 19 + TypeScript + Vite
│   ├── Quantum Titanium ADAS Cockpit Theme (#070B14, #101A2B, #3B82F6)
│   ├── Lucide Icons + Native HTML5 Media
│   └── Vite Proxy (/api & /static -> http://127.0.0.1:8000)
│
├── Backend (Port 8000)
│   ├── FastAPI + Uvicorn ASGI Server
│   ├── SQLAlchemy ORM + SQLite/PostgreSQL (aerovision.db)
│   ├── Pydantic V2 Data Contracts & Validation
│   ├── JWT Auth & Role-Based Access Control (Driver / Admin)
│   └── Chunked File Storage (uploads/videos, uploads/challans, uploads/snapshots)
│
└── AI Perception Core
    ├── models/rto_best.pth (MobileNetV2 Residual Network, 108 Indian RTO Classes)
    ├── Multi-Scale Sliding ROI & Test-Time Augmentation (TTA)
    ├── TrafficSafetyCoordinator (4-Agent Arbitration Pipeline)
    └── DriverAlertSystem (Speech & HUD Alert Generation)
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.10+ (with `.venv` created)
- Node.js 18+ & npm

### 2. Single-Click Launch (Windows)
Double-click:
```cmd
run_aerovision_platform.bat
```
This batch script will:
1. Launch the FastAPI backend on `http://localhost:8000`
2. Launch the React Vite frontend on `http://localhost:5173`
3. Automatically open your default browser to `http://localhost:5173`

### 3. Manual Launch

**Terminal 1 — Backend:**
```powershell
.\.venv\Scripts\activate
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm install
npm run dev
```

Visit: `http://localhost:5173`
Interactive API Docs: `http://localhost:8000/docs`

---

## 🔑 Pre-Seeded Demo Credentials

| Role | Email | Password | Pre-loaded Data |
| :--- | :--- | :--- | :--- |
| **Driver** | `driver@aerovision.ai` | `password123` | Tata Nexon EV, 2 Challans, Dashcam Video, 88/100 Safety Score |
| **Admin** | `admin@aerovision.ai` | `admin123` | Full access to Admin Ops, System Health, User Directory & Audit Logs |

*(Users can also register new accounts with personal email, phone, and password).*

---

## 🧪 Automated Testing

Run the full integration test suite with `pytest`:
```powershell
.\.venv\Scripts\pytest.exe test_aerovision_platform.py -v
```

### Verified Test Results (12/12 Passed):
- `test_root_endpoint`: Platform identity & status online.
- `test_authentication_driver`: Driver login & JWT bearer token.
- `test_authentication_admin`: Admin login & RBAC role.
- `test_invalid_credentials`: 401 Unauthorized rejection on bad password.
- `test_profile_and_dashboard`: User profile & dynamic dashboard telemetry.
- `test_vehicle_garage_crud`: Vehicle creation (201), listing, and deletion.
- `test_challan_center_and_attribution`: Challans list, violation types, and Parivahan attribution.
- `test_traffic_rules_and_learning_center`: 108 Indian RTO signs catalog and mistake awareness.
- `test_quiz_engine_and_score_update`: Scored quiz evaluation and safety score computation.
- `test_dashcam_vault_quota`: 500 MB storage quota validation.
- `test_ai_perception_model_evaluation`: 108-class PyTorch model verification, latency, and agent pipeline.
- `test_admin_console_rbac`: 403 Forbidden enforcement for drivers attempting admin access.

---

## 🛡️ Statutory Disclaimer & Attribution
AeroVision is an AI-assisted driver safety education and vehicle intelligence platform. Detections and alerts are advisory and do not replace driver attentiveness or constitute legal evidence. Challan records are verified against user-provided documents and point to official government portals ([Parivahan Sewa](https://echallan.parivahan.gov.in/)).
