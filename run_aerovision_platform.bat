@echo off
title AeroVision Platform - Intelligent Road Safety & Vehicle Intelligence
cd /d "%~dp0"
echo =======================================================================
echo          AEROVISION PLATFORM - LAUNCHING AVIONICS STACK
echo    AI-Powered Road Safety, Traffic Compliance & Dashcam Vault
echo =======================================================================
echo.
echo [1/3] Starting FastAPI Backend on http://localhost:8000 ...
start "AeroVision Backend" cmd /k "title AeroVision Backend && .venv\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

echo [2/3] Waiting for Backend to initialize...
timeout /t 3 /nobreak >nul

echo [3/3] Starting Vite Frontend on http://localhost:5173 ...
start "AeroVision Frontend" cmd /k "title AeroVision Frontend && cd frontend && npm run dev"

echo.
echo Launching AeroVision in your default browser...
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo =======================================================================
echo  AeroVision stack is now active!
echo  Frontend UI:  http://localhost:5173
echo  FastAPI Docs: http://localhost:8000/docs
echo.
echo  Demo Credentials:
echo   - Driver: driver@aerovision.ai / password123
echo   - Admin:  admin@aerovision.ai  / admin123
echo =======================================================================
echo Press any key to stop all background windows...
pause >nul
taskkill /FI "WINDOWTITLE eq AeroVision Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq AeroVision Frontend*" /T /F >nul 2>&1
echo AeroVision Platform stopped.
