import uvicorn
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.config import settings, STORAGE_DIR, SNAPSHOTS_DIR, CHALLANS_DIR
from backend.database import Base, engine
from backend.seed_data import seed_database
from backend.routers import (
    auth, vehicles, challans, rules,
    vault, ai, dashboard, admin
)

# Initialize database schema & seed initial RTO rules on boot
Base.metadata.create_all(bind=engine)
seed_database()

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Full-stack AI-Powered Road Safety, Traffic Compliance, and Dashcam Intelligence Platform.",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(vehicles.router, prefix=settings.API_V1_PREFIX)
app.include_router(challans.router, prefix=settings.API_V1_PREFIX)
app.include_router(rules.router, prefix=settings.API_V1_PREFIX)
app.include_router(vault.router, prefix=settings.API_V1_PREFIX)
app.include_router(ai.router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)

# Static file serving for snapshots and test sign images
app.mount("/static/snapshots", StaticFiles(directory=str(SNAPSHOTS_DIR)), name="snapshots")
app.mount("/static/challans", StaticFiles(directory=str(CHALLANS_DIR)), name="challans")

test_dataset_path = Path("dataset/Test")
if test_dataset_path.exists():
    app.mount("/static/signs", StaticFiles(directory=str(test_dataset_path)), name="signs")

@app.get("/")
def root():
    return {
        "platform": "AeroVision — Intelligent Road Safety & Vehicle Intelligence Platform",
        "status": "ONLINE",
        "api_docs": "/docs",
        "version": "2.0.0",
        "model": "Official Indian RTO 108-Class Residual Network",
        "architecture": "Quantum Titanium Cockpit Avionics"
    }

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "AeroVision Core API"}

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
