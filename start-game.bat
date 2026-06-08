@echo off
REM Start game services in 3 separate PowerShell windows
REM API on localhost:3200  |  Admin on localhost:3100  |  Player on localhost:3000

setlocal enabledelayedexpansion
cd /d "%~dp0"
set "ROOT=%cd%"

echo.
echo Starting PostgreSQL without wiping saved data...
docker compose up -d postgres --wait
if errorlevel 1 (
  echo.
  echo [ERROR] Failed to start PostgreSQL. Is Docker Desktop running?
  echo Start Docker Desktop, then run this script again.
  pause
  exit /b 1
)

set "ACCOUNT_COUNT="
for /f "usebackq delims=" %%A in (`docker compose exec -T postgres psql -U app_user -d eye_db -tAc "SELECT count(*) FROM ""User"";" 2^>nul`) do (
  set "ACCOUNT_COUNT=%%A"
)

if not defined ACCOUNT_COUNT (
  echo Fresh database detected. Running setup...
  call corepack pnpm db:setup
  if errorlevel 1 (
    echo.
    echo [ERROR] Database setup failed.
    pause
    exit /b 1
  )
  echo Fresh database created.
) else (
  echo Existing database found (!ACCOUNT_COUNT! accounts^) -- reusing your saved data.
)

REM Build the shared game engine first so the API starts cleanly (mirrors predev:api).
echo.
echo Building game engine...
call corepack pnpm --filter @eye/game-engine build
if errorlevel 1 (
  echo.
  echo [ERROR] Game engine build failed. The API will not start without it.
  pause
  exit /b 1
)

REM API Server
start "API Server (3200)" powershell -NoExit -Command "cd '%ROOT%\apps\api'; npm run dev"

REM Admin Web
start "Admin Web (3100)" powershell -NoExit -Command "cd '%ROOT%\apps\admin-web'; npm run dev"

REM Player Web
start "Player Web (3000)" powershell -NoExit -Command "cd '%ROOT%\apps\player-web'; npm run dev"

echo.
echo Launched 3 PowerShell windows:
echo   - API Server  -^> http://localhost:3200
echo   - Admin Web   -^> http://localhost:3100
echo   - Player Web  -^> http://localhost:3000
echo.
echo If a window shows an error, read THAT window (especially "API Server (3200)").
echo Login/Register need the API running; guest mode works without it.
echo Press Ctrl+C in each window to stop. This launcher stays open below.
pause
