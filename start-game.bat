@echo off
REM Start game services in 3 separate PowerShell windows
REM API on localhost:3200
REM Admin Web on localhost:3100
REM Player Web on localhost:3000

setlocal enabledelayedexpansion
cd /d "%~dp0"
set "ROOT=%cd%"

echo.
echo Starting PostgreSQL without wiping saved data...
docker compose up -d postgres --wait
if errorlevel 1 (
  echo Failed to start PostgreSQL.
  exit /b 1
)

set "ACCOUNT_COUNT="
for /f "usebackq delims=" %%A in (`docker compose exec -T postgres psql -U app_user -d eye_db -tAc "SELECT count(*) FROM ""User"";" 2^>nul`) do (
  set "ACCOUNT_COUNT=%%A"
)

if not defined ACCOUNT_COUNT (
  echo Fresh database detected. Running setup...
  corepack pnpm db:setup
  if errorlevel 1 (
    echo Database setup failed.
    exit /b 1
  )
  echo Fresh database created.
) else (
  echo Existing database found (!ACCOUNT_COUNT! accounts) -- reusing your saved data.
)

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
