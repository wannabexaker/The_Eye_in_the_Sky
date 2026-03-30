# Developer Workflow: Build and Dev Safety

## TL;DR

Never run a player build while the player dev server is active.

Use these commands:

- `corepack pnpm dev:player`
- `corepack pnpm dev:player:clean`
- `corepack pnpm build:player:clean`

## Why This Exists

The issue was reproducible: running build and dev at the same time can corrupt `.next` artifacts and break chunk loading, causing errors like:

- `TypeError: e[o] is not a function`
- `GET /_next/static/chunks/*.js 404`

## Protected Workflow

1. For normal iteration, run only dev:

```bash
corepack pnpm dev:player
```

2. For a clean dev restart:

```bash
corepack pnpm dev:player:clean
```

3. For a safe build:

```bash
corepack pnpm build:player:clean
```

`build:player:clean` calls a guard that checks local ports `3000` and `3001` and blocks the build if the player dev server appears active.

## Recovery

If chunk 404s appear:

```bash
# stop dev first (Ctrl+C)
Remove-Item -Path "apps/player-web/.next" -Recurse -Force
corepack pnpm dev:player
```

## Implemented Controls

- `apps/player-web/scripts/guard-no-dev-server.cjs`
   - Detects active server on `127.0.0.1:3000/3001`
   - Fails fast before build with clear instructions
- `apps/player-web/package.json`
   - `build` now guarded
   - `build:clean` now guarded + cache reset
- `package.json`
   - Added root shortcuts for clean dev/build flow

## Notes

- `.next` remains ignored by git.
- This process is intentionally strict to protect developer velocity and avoid unstable local states.

