@echo off
REM Destructive local database reset. Use only when you want a fresh database.

setlocal
cd /d "%~dp0"

set /p "CONFIRM=This ERASES all saved data. Continue? [y/N] "
if /i not "%CONFIRM%"=="y" (
  echo Reset cancelled.
  exit /b 0
)

echo.
echo Removing Docker volumes and resetting PostgreSQL...
docker compose down -v
if errorlevel 1 (
  echo Docker compose reset failed.
  exit /b 1
)

docker compose up -d postgres --wait
if errorlevel 1 (
  echo Failed to start PostgreSQL.
  exit /b 1
)

corepack pnpm db:setup
if errorlevel 1 (
  echo Database setup failed.
  exit /b 1
)

echo Fresh database created.
