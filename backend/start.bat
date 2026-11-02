@echo off
cd /d "%~dp0"
title MediXO EduX API
echo Starting backend on http://127.0.0.1:8000
if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" -m uvicorn app.main:app --reload --reload-dir app --reload-dir scripts --host 127.0.0.1 --port 8000
) else (
  python -m uvicorn app.main:app --reload --reload-dir app --reload-dir scripts --host 127.0.0.1 --port 8000
)
pause
