@echo off
cd backend
..\venv\Scripts\python -m uvicorn main:app --reload
pause
