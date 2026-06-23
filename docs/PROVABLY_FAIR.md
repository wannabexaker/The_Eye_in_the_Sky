# Provably-Fair & Server-Authoritative Spins

> Status: **built, disabled by default.** Everything here activates only when
> `PROVABLY_FAIR_ENABLED=true` on the API. With the flag off, the game behaves
> exactly as before (client-resolved `/player/rounds`).

## Why

For real-money operation a player must not be able to influence or forge a spin
outcome, and must be able to verify the operator did not alter results after the
fact. This adds:

1. **Server-authoritative spins** — `POST /player/spin` resolves the outcome on
   the server with the shared deterministic engine, validates the wallet
   server-side, and persists atomically. The client never supplies the result.
2. **Provably-fair commit-reveal** — outcomes are derived from a seed the server
   commits to (via a published hash) *before* play, combined with a player-chosen
   client seed. Revealing the server seed lets anyone reproduce every outcome.

The legacy client-resolved path (`POST /player/rounds`) stays the default so the
current gameplay loop is untouched while the flag is off.

## Scheme

Per player we store (`PlayerFairnessSeed`):

| Field | Meaning |
|---|---|
| `serverSeed` | secret 32-byte hex, revealed only on rotation |
| `serverSeedHash` | `sha256(serverSeed)` — the public commitment |
| `clientSeed` | player-settable string (defaults random) |
| `nonce` | increments once per spin |
| `previousServerSeed` / `previousServerSeedHash` | last revealed seed, for verifying past rounds |

The deterministic per-spin engine seed is:

```
seed = HMAC_SHA256(serverSeed, `${clientSeed}:${nonce}`)  →  first 4 bytes (big-endian) as uint32
```

That `uint32` is fed to the engine's existing LCG RNG. **The RNG algorithm is
unchanged** — only the seed source — so RTP/volatility are identical to the base
math (the engine regression bands still pass).

Each round persists `seedUsed`, `clientSeed`, `serverSeedHash`, and `nonce`, so a
revealed `serverSeed` verifies the whole batch.

## Endpoints (auth required, gated by the flag)

- `GET  /player/fairness` → `{ serverSeedHash, clientSeed, nonce, previousServerSeed, previousServerSeedHash }` (never the active `serverSeed`)
- `POST /player/fairness/client-seed` `{ clientSeed }` → updates the client seed
- `POST /player/fairness/rotate` → reveals the current `serverSeed`, issues a new commitment, resets the nonce
- `POST /player/spin` `{ bet, profileId? }` → server-authoritative resolved spin + wallet snapshot

## How to verify a round

1. Note the round's `clientSeed` and `nonce` (shown in the Fairness panel / stored on the round).
2. Rotate your seed (`POST /player/fairness/rotate`) to reveal the `serverSeed` that was committed for that batch.
3. Reproduce it:

```bash
corepack pnpm --filter api exec tsx ../../scripts/verify-fairness.ts <revealedServerSeed> <clientSeed> <nonce> <bet>
```

The script recomputes `HMAC_SHA256(serverSeed, "clientSeed:nonce")`, derives the
same `uint32` seed, runs the engine, and prints the outcome. It must match the
stored round (`Round.seedUsed` / `Round.resultJson`). Base-game spins reproduce
from a fresh state; bonus-continuation spins additionally need the pre-spin game
state.

## Enabling

Set on the API (e.g. RPi `.env`):

```env
PROVABLY_FAIR_ENABLED=true
```

Recreate the API container. For authenticated, server-backed sessions the
Fairness panel appears in the player Menu and the in-game spin button routes
through `/player/spin`. Guest/simulator play and flag-off sessions keep the
legacy local client-resolved path.
