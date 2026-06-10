# game-engine Index

## Purpose
Deterministic slot math engine used by the player shell and simulation tooling.

## Key Files
- [src/index.ts](src/index.ts): public export surface
- [src/config.ts](src/config.ts): engine configuration
- [src/spin-resolver.ts](src/spin-resolver.ts): main spin resolution flow
- [src/modifier-engine.ts](src/modifier-engine.ts): feature symbol effects
- [src/simulation.ts](src/simulation.ts): long-run simulation runner
- [src/engine-regression.test.ts](src/engine-regression.test.ts): math guardrails

## Current Source Layout
The engine currently keeps its runtime source flat under `src/` because the export surface is shared across app and simulation tooling. The index file is the stable contract; internal grouping can be refactored later behind that boundary.
