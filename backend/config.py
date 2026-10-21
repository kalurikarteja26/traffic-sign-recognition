import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "uploads"
VIDEOS_DIR = STORAGE_DIR / "videos"
CHALLANS_DIR = STORAGE_DIR / "challans"
SNAPSHOTS_DIR = STORAGE_DIR / "snapshots"

# Ensure upload directories exist
VIDEOS_DIR.mkdir(parents=True, exist_ok=True)
CHALLANS_DIR.mkdir(parents=True, exist_ok=True)
SNAPSHOTS_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    PROJECT_NAME: str = "AeroVision — Intelligent Road Safety & Vehicle Intelligence Platform"
    API_V1_PREFIX: str = "/api"
    SECRET_KEY: str = os.getenv("AEROVISION_SECRET_KEY", "aerovision-quantum-titanium-secret-jwt-key-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'aerovision.db'}")
    DEFAULT_STORAGE_QUOTA_MB: int = 500  # 500 MB per user
    CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8501",
        "http://127.0.0.1:8501",
        "*"
    ]
    MODEL_CHECKPOINT_PATH: str = str(BASE_DIR / "models" / "rto_best.pth")

settings = Settings()
