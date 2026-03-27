$env:DATABASE_URL = 'sqlserver://localhost:1433;database=TheEyeInTheSky;user=sa;password=YourStrong!Passw0rd;encrypt=false;trustServerCertificate=true'
$env:ADMIN_SEED_EMAIL = 'admin@example.com'
$env:ADMIN_SEED_PASSWORD = 'ChangeMe123!'
$env:AUTH_COOKIE_SECRET = 'replace-with-a-long-random-secret'
corepack pnpm --filter api exec node --import tsx dist/apps/api/src/main.js
