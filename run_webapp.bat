@echo off
title RTO Traffic Sign Recognition - Web Application
cd /d "%~dp0"
echo =======================================================
echo  Launching Streamlit Web Application
echo  Model: 108-Class Official Indian RTO Model
echo =======================================================
".venv\Scripts\python.exe" -m streamlit run app.py
pause
