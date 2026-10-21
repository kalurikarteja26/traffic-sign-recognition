@echo off
title RTO Traffic Sign Recognition - Live Webcam
cd /d "%~dp0"
echo =======================================================
echo  Launching Live Traffic Sign Recognition (Webcam 0)
echo  Model: 108-Class Official Indian RTO Model
echo =======================================================
".venv\Scripts\python.exe" -m src.webcam_recognition --camera 0
pause
