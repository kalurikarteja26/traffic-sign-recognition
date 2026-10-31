# ==============================================================================
# AeroVision AI Backend — Production Dockerfile
# Optimized for Render, Railway, AWS ECS, GCP Cloud Run, and Docker VPS
# ==============================================================================

FROM python:3.11-slim

# Set environment flags
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=10000 \
    ENVIRONMENT=production

# Install system dependencies (ffmpeg for video streaming, curl for health checks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies using lightweight CPU PyTorch wheels
COPY requirements-deploy.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements-deploy.txt

# Copy backend source code, perception model, and safety agents
COPY backend/ ./backend/
COPY src/ ./src/
COPY models/ ./models/
COPY traffic_safety_agents/ ./traffic_safety_agents/
COPY traffic_safety_agents.py .

# Create required directories for uploads and persistent data
RUN mkdir -p uploads/videos uploads/challans uploads/snapshots uploads/tts_cache

# Expose ports
EXPOSE 10000 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT:-10000}/ || exit 1

# Launch FastAPI ASGI server
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
