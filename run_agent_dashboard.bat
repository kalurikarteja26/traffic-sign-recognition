@echo off
title Traffic Safety Agent - Desktop Dashboard
cd /d "%~dp0"
echo =======================================================
echo  Launching Traffic Safety Agent Desktop Dashboard
echo =======================================================
".venv\Scripts\python.exe" agent_dashboard.py
pause
