@echo off
title RTO Traffic Sign Recognition - Simulated Driving Demo
cd /d "%~dp0"
echo =======================================================
echo  Launching Simulated Driving Demo
echo  Model: 108-Class Official Indian RTO Model
echo =======================================================
".venv\Scripts\python.exe" -m src.webcam_recognition --demo
pause
