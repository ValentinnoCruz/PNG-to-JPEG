@echo off
cd /d "%~dp0"
echo Building PNG to JPEG Metadata Converter v4.2 installer...
echo.
call npm install
echo.
call npm run dist
echo.
pause
