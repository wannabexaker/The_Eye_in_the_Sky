-- PostgreSQL least-privilege runtime user setup.
-- Run as a PostgreSQL admin user, then put only the app user's connection
-- string in the API runtime environment.

-- Replace placeholders before running.
-- Database: eye_db
-- Runtime user: app_slot_game

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_slot_game') THEN
    CREATE ROLE app_slot_game LOGIN PASSWORD '<app_slot_game_password>';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE eye_db TO app_slot_game;

\connect eye_db

GRANT USAGE ON SCHEMA public TO app_slot_game;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_slot_game;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO app_slot_game;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_slot_game;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO app_slot_game;

-- Example runtime URL:
-- DATABASE_URL="postgresql://app_slot_game:<app_slot_game_password>@localhost:5432/eye_db?schema=public"
