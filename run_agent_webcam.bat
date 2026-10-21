@echo off
title Traffic Safety Agent - Integrated Real-Time Webcam
cd /d "%~dp0"
echo =======================================================
echo  Launching Live Traffic Safety Multi-Agent System
echo  Camera: Webcam 0 (DirectShow backend)
echo  Press [Q] to quit, [A] to toggle audio, [E] for AI
echo =======================================================
".venv\Scripts\python.exe" webcam_agent_demo.py --camera 0
pause
