@echo off
title Launch KHATA Application
echo ========================================================
echo   Launching KHATA: Full Stack Application
echo   Frontend: http://localhost:5173/
echo   Backend:  http://localhost:8080/api/docs
echo ========================================================
start "KHATA Backend (Port 8080)" cmd /k "%~dp0start-backend.bat"
timeout /t 2 /nobreak >nul
start "KHATA Frontend (Port 5173)" cmd /k "%~dp0start-frontend.bat"
echo Both servers launched in separate windows!
echo Open your browser at: http://localhost:5173/
timeout /t 5

