@echo off
title Traffic Safety AI - Standalone Accurate Desktop Application
cd /d "%~dp0"

echo =====================================================================
echo    TRAFFIC SAFETY AI - HIGH-PRECISION STANDALONE DESKTOP SYSTEM
echo =====================================================================
echo Starting application with hardware-accelerated camera ingestion...
echo.

if exist .venv\Scripts\python.exe (
    .venv\Scripts\python.exe desktop_app.py
) else (
    python desktop_app.py
)

pause
