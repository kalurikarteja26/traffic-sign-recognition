@echo off
title Traffic Safety Agent - Verification Tests
cd /d "%~dp0"
echo =======================================================
echo  Running Traffic Safety Multi-Agent System Tests
echo =======================================================
".venv\Scripts\python.exe" test_agents.py
echo.
pause
