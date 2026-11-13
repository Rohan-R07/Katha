@echo off
title KHATA Frontend Dashboard
echo ========================================================
echo   KHATA - Digital Khata for Kirana Shops Frontend
echo   URL: http://localhost:5173/
echo ========================================================
cd /d "%~dp0artifacts\khata-dashboard"
set PORT=5173
set BASE_PATH=/
npm run dev
pause

