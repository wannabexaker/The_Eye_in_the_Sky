$env:DATABASE_URL = 'postgresql://app_user:<postgres_password>@localhost:5432/eye_db?schema=public'
$env:AUTH_COOKIE_SECRET = '<replace-with-a-long-random-secret>'

# Optional local-only seed credentials. Leave blank unless you need bootstrap seeding.
$env:ADMIN_SEED_EMAIL = ''
$env:ADMIN_SEED_PASSWORD = ''
$env:PLAYER_SEED_EMAIL = ''
$env:PLAYER_SEED_PASSWORD = ''

corepack pnpm --filter api exec node --import tsx dist/apps/api/src/main.js
