@echo off
title KHATA Backend API Server
echo ========================================================
echo   KHATA - Sri Ganesh Kirana Stores Backend API
echo   URL: http://localhost:8080/api/docs
echo ========================================================
set PORT=8080
set DATABASE_URL=sqlite:///./khata.db
set JWT_SECRET=CG4m3ThBbjbP3u6p60Iubp4waiRCEflbThLSjTY9QoQ4jZu0esfTBIo17_0wDheu
python -m backend.run
pause

