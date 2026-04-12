@echo off
REM Start game services in 3 separate PowerShell windows
REM API on localhost:3200
REM Admin Web on localhost:3100
REM Player Web on localhost:3000

setlocal enabledelayedexpansion
cd /d "%~dp0"
set "ROOT=%cd%"

REM API Server
start "API Server (3200)" powershell -NoExit -Command "cd '%ROOT%\apps\api'; npm run dev"

REM Admin Web
start "Admin Web (3100)" powershell -NoExit -Command "cd '%ROOT%\apps\admin-web'; npm run dev"

REM Player Web
start "Player Web (3000)" powershell -NoExit -Command "cd '%ROOT%\apps\player-web'; npm run dev"

echo.
echo Launching 3 PowerShell windows:
echo - API Server will start on http://localhost:3200
echo - Admin Web will start on http://localhost:3100
echo - Player Web will start on http://localhost:3000
echo.
echo Press Ctrl+C in each window to stop.
