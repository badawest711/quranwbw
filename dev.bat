@echo off
cd /d "c:\Users\aydyn\Documents\QuranWBW\quranwbw"
start "QuranWBW Dev Server" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul
start chrome "http://localhost:5173"
