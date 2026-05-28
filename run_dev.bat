@echo off
cd /d "%~dp0"
echo Starting PNG to JPEG Metadata Converter v4.2...
echo.
call npm install
echo.
call npm start
echo.
pause
