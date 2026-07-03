# The Eye in the Sky — Math Specification & Audit Pack

> **Audience:** certification labs, due-diligence reviewers, and operators.
> This is the entry point to the math documentation. Every number in this pack
> is reproducible from the repository with a single command, and every shipped
> profile is guarded by RTP regression bands in CI.

## 1. Game identity

| | |
|---|---|
| Title | The Eye in the Sky |
| Type | Cluster-pays cascade slot, 6×5 grid (30 cells) |
| Mechanics | Orthogonal clusters (≥4), top-down gravity refill, cascade multiplier ladder, meter-driven bonus with budgeted free spins (Samsara pool) |
| Variant | Constellation (count-anywhere ≥8, scatter-triggered free spins, weighted multiplier orbs) |
| Engine | Deterministic TypeScript engine, shared verbatim between server and client (`packages/game-engine`) |

Detailed mechanics: [game-math.md](game-math.md) (main game),
[variant-simple.md](variant-simple.md) (Constellation variant),
[game-economy.md](game-economy.md) (wallet/economy model).

## 2. Math profiles

| Profile | Config version | Target RTP | Volatility | Status |
|---|---|---|---|---|
| `math_base_v2_0` | `eye-sky-math-v2.0` | 95.4% | medium | **active default** |
| `constellation_simple_v0_1` | `eye-sky-constellation-v0.1` | 95.2% | high | selectable variant |
| `legacy_v1_3` | `eye-sky-math-v1.3` | 95.5% | medium | archived reference |

The authoritative source for every paytable, symbol weight, ladder and bonus
parameter is [`packages/game-engine/src/config.ts`](../packages/game-engine/src/config.ts) —
profiles are immutable value objects keyed by a `version` string that is
persisted on every round. Baseline lock rationale:
[math-baseline-v2-locked.md](math-baseline-v2-locked.md).

## 3. RNG specification

- **Algorithm:** 32-bit linear congruential generator,
  `state = (1664525 · state + 1013904223) mod 2³²`, output `state / 2³²`
  (`packages/game-engine/src/rng.ts`). All randomness in a spin (board fill,
  refills, modifier rolls, multiplier draws) is consumed from a single stream
  seeded once per spin.
- **Seed domain:** uint32. A spin is a pure function
  `resolveSpin({bet, state, seed}, config) → SpinResult`; identical inputs give
  byte-identical results (enforced by regression test).
- **Seed sources:**
  | Context | Source |
  |---|---|
  | Client/simulator play | `crypto.getRandomValues` (uint32) |
  | Batch simulation | `deriveSpinSeed(baseSeed, index)` — Knuth multiplicative step, reproducible |
  | Server-authoritative spins | Commit-reveal: `HMAC-SHA256(serverSeed, "clientSeed:nonce")` → first 4 bytes big-endian (see [PROVABLY_FAIR.md](PROVABLY_FAIR.md)) |
- **Certification note:** the LCG is the *distribution* engine; the
  *unpredictability* comes from the seed source. For regulated real-money
  deployment the seed source is already cryptographic (HMAC-SHA256 commit-reveal
  path), and the RNG function itself is a single injection point (`RngFn`) that
  can be swapped for a lab-preferred CSPRNG without touching game logic.

## 4. Audit contract (per spin / per round)

Every `SpinResult` exposes the fields an auditor needs to replay and attribute
value (enforced by `engine-regression.test.ts`):

- `seedUsed`, `configVersion` — full determinism inputs
- `initialBoard`, `endingBoard`, `cascades`, `evaluatedWins` — step-by-step outcome
- `multipliersTriggered`, `modifiersTriggered` — EV attribution by feature
- `bonusStateBefore/After`, `meterProgress` — bonus lifecycle
- `totalWin`, `walletDelta`, `debugMetadata.chargedBet` — money movement

Server-persisted rounds additionally store the commit-reveal tuple
(`clientSeed`, `serverSeedHash`, `nonce`) so any third party can re-derive
`seedUsed` after the server seed is revealed and reproduce the round:

```
corepack pnpm --filter api exec tsx ../../scripts/verify-fairness.ts <serverSeed> <clientSeed> <nonce> [bet]
```

## 5. PAR reports (generated, reproducible)

Per-profile PAR sheets — design contract (symbol probabilities, paytable) plus
a seeded simulation batch (RTP, CI95, hit rate, percentiles, cascade and bonus
cadence) — live in [`docs/par/`](par/):

- [PAR_math_base_v2_0.md](par/PAR_math_base_v2_0.md)
- [PAR_constellation_simple_v0_1.md](par/PAR_constellation_simple_v0_1.md)
- [PAR_legacy_v1_3.md](par/PAR_legacy_v1_3.md)

Regenerate (any spin count / seed; committed reports use 200,000 spins, seed 1337):

```
corepack pnpm --filter @eye/game-engine par-report -- --spins 200000 --seed 1337
```

JSON twins (`PAR_<profile>.json`) carry the same data for programmatic
comparison between releases.

## 6. Regression guard (CI-enforced)

`packages/game-engine/src/engine-regression.test.ts` runs on every push/PR
(`.github/workflows/ci.yml`) and fails the build if any shipped profile drifts
outside its band at 50,000 deterministic spins (seed 1337):

| Profile | RTP band | Hit-rate band | Bonus-rate band |
|---|---|---|---|
| `legacy_v1_3` | 93.0–97.5% | 44–54% | 0.2–0.6% |
| `math_base_v2_0` | 93.0–97.5% | 45–56% | 0.2–0.6% |
| `constellation_simple_v0_1` | 93.0–97.5% | 42–52% | 0.4–0.8% |

The same suite locks determinism (`resolveSpin` byte-equality), wallet-delta
consistency, bonus-award correctness, and the audit contract fields.

## 7. Change control

1. Math changes land only through a new `version` string in `config.ts` —
   rounds persist the version they were played under, so historical rounds
   always replay against their original math.
2. A change that moves any profile outside its band must update the band **and**
   this pack (PAR regeneration + baseline doc) in the same PR.
3. `docs/par/*` are generated artifacts: regenerate, never hand-edit.

## 8. Known gaps toward lab certification

Documented deliberately — these are operator/lab tasks, not engine gaps:

- Formal RNG scrutiny (e.g. Marsaglia/NIST batteries) by an accredited lab;
  swap-in of a lab-approved CSPRNG behind `RngFn` if required.
- Jurisdiction-specific max-win / max-exposure caps (config-level change).
- Signed build provenance for the certified binary (CI artifact signing).
