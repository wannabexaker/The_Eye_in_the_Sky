# The Eye in the Sky PRD

## Status
- Phase: `Phase 1 fake-money prototype`
- Owner: `Principal Engineer / Game Systems Architect / Product Owner`
- Source of truth: `This file`
- Last updated: `2026-03-17`

## Product Summary
`The Eye in the Sky` is a browser-playable fake-money slot prototype with a dark celestial horror identity. It uses a `6x5` board, `pay-anywhere / cluster-style` wins, `cascades`, `random and persistent multipliers`, and a `free spins bonus` mode called `Sky Opens`.

This is explicitly **not** a real-money gambling product. Phase 1 contains no payments, no KYC, no withdrawals, and no licensed-gambling infrastructure claims.

## Goals
- Ship a polished playable prototype fast.
- Keep the engine deterministic and isolated.
- Maintain a wallet / ledger abstraction even for fake money.
- Keep docs ahead of implementation.
- Prepare clean migration path to server-authoritative resolution.
- Lock a coherent math and pacing model before deeper balancing.

## Non-Goals
- Real payments
- Withdrawals
- Compliance systems for regulated launch
- Promotions / affiliate systems
- Multi-game casino platform complexity beyond MVP structure

## Target Experience
- Premium, ominous, responsive web slot
- Strong visual atmosphere: sacred horror, divine surveillance, burning halos, forbidden temple in the sky
- Modern slot rhythm: spin, suspense, cascade chain, multiplier spikes, meaningful bonus mode

## Audience
- Internal prototyping and design validation
- Fake-money gameplay iteration
- Math tuning and systems validation

## Core Pillars
1. `Original identity`
   The game must feel inspired by modern cascade slots, but not derivative in theme, naming, art, copy, sound, or brand presentation.
2. `Server-ready fairness model`
   Outcomes come from engine math, never from animation scripting.
3. `Playable quickly`
   Frontend polish matters, but only after deterministic game logic is stable.
4. `Document-first development`
   PRD, architecture, math notes, economy notes, roadmap, and tasks are updated with every meaningful feature change.

## Game Identity
- Title: `The Eye in the Sky`
- Tone: `dark, divine, ominous, premium, mysterious`
- Theme motifs:
  - seraphim
  - burning halos
  - many-eyed angels
  - samsara
  - ouroboros
  - forbidden temple in the sky
  - sacred surveillance

## Symbols
### Low Symbols
- Ashen Sigil
- Broken Halo
- Ritual Dagger
- Sealed Scroll

### High Symbols
- Seraphim Feather
- Burning Crown
- Ophidian Relic
- Celestial Gate

### Special Symbols
- Seraphim Eye
- Samsara
- Ouroboros
- Panepoptis Ophthalmos

## Core Gameplay
- Board: `6 columns x 5 rows`
- Evaluation: `pay-anywhere / cluster-based`
- Wins remove winning cells
- Remaining symbols collapse top-down
- New symbols refill the board
- Cascades can chain
- Multipliers and modifiers may trigger during cascades
- Bonus mode supports persistent multiplier behavior

## Bonus Mode
- Name: `Sky Opens`
- Base trigger:
  - `3+ Samsara symbols` and/or
  - `full Samsara meter`
- Baseline reward: `8 free spins`
- Bonus characteristics:
  - increased Seraphim Eye chance
  - additive / persistent multiplier behavior
  - retrigger support
  - controlled volatility

## Balancing Direction
- Current tuned runtime profile: `eye-sky-math-v1.1`
- Recommended target RTP band for Phase 1: `94.0% to 96.0%`
- Recommended volatility band for Phase 1: `medium`
- Bonus mode should contribute meaningful value without absorbing almost all RTP
- Meter-driven anticipation should be visible and fair, not manipulative

## Engine Product Rules
- Engine is pure TypeScript domain logic in `packages/game-engine`
- UI must never decide results
- Engine must be deterministic from `seed + input + config`
- Round outputs must be audit-friendly
- No fake near-miss manipulation
- No deceptive outcome steering
- No behavioral exploitation systems

## Required MVP Features
- fake balance
- fake wallet/ledger abstraction
- simulated wallet operations: deposit, withdrawal, payment methods, and transaction history
- cumulative simulation-wallet totals for deposited and withdrawn funds
- bet selection
- spin
- 6x5 board
- cluster/pay-anywhere evaluation
- cascades
- random / persistent multipliers
- 1-2 special mechanics
- bonus meter
- free spins / bonus mode
- recent round history
- reset balance
- dev/debug balancing controls
- responsive professional UI shell
- simulation tooling
- first-pass original art asset pack for symbols, UI frame, logo, and atmospheric background
- welcome ritual overlay with first-run bonus credits

## Tech Direction
- Monorepo
- Next.js
- PixiJS
- Zustand
- TailwindCSS
- NestJS
- PostgreSQL
- Prisma
- Redis
- BullMQ
- JWT auth
- Swagger

## Monorepo Shape
- `apps/api`
- `apps/player-web`
- `apps/admin-web`
- `packages/game-engine`
- `packages/shared-types`
- `packages/ui`

## MVP Functional Requirements
### Player Web
- HUD with balance, bet, win, meter, bonus state
- low-balance deposit prompt when the wallet cannot cover the minimum bet
- spin
- autoplay stub
- history panel
- sound toggle stub
- settings/debug panel
- PixiJS-ready game canvas area

### Admin Web
- config editor shell
- symbol weight editor shell
- paytable editor shell
- simulation runner shell
- audit/history viewer shell

### API
- future-ready modules for:
  - auth
  - users
  - wallet
  - ledger
  - game-catalog
  - game-engine
  - rounds
  - bonus-state
  - admin
  - audit-logs

## Current Implementation Status
- `Done`
  - root workspace
  - initial playable Next.js prototype
  - initial game-engine with spin resolution, clusters, cascades, modifier hooks
  - fake balance, round history, reset balance
  - simulation command baseline
  - docs baseline under `/docs`
  - api skeleton with NestJS + Swagger bootstrap
  - admin-web shell
  - Prisma schema draft
  - shared-types and ui package skeletons
  - PixiJS ambient board shell
  - Zustand UI settings shell
  - modular player-web layout with header, board zone, control panel, recent rounds, and debug panel
  - PixiJS board renderer as primary gameplay presentation layer
  - presentation-only spin state machine
  - sound feedback manager
  - engine contract expansion to full round shape with audit/debug metadata
  - deterministic regression foundation
  - simulation report expansion and config version propagation
  - SVG first-pass original asset pack for symbols, meter icon, board frame, logo, and atmospheric background
  - typography system refactor with atmospheric display font and readable gameplay serif
  - fullscreen game-shell behavior inside the player application
  - win readability improvements through direct board path/highlight overlays
  - simulated wallet system with deposits, withdrawals, saved payment methods, and transaction history
  - welcome overlay with first-run bonus credit grant
  - Pixi presentation upgrade with layered atmosphere, hover response, pooled particles, cascade dissolve, and stronger win/bonus feedback
  - richer synthetic sound manager with layered tones and optional stereo pan
- `In progress`
  - PRD-driven repo alignment
  - Zustand gameplay store migration
  - Tailwind integration
  - painted production asset generation pipeline for symbol suite, background, frame, and bonus splash
- `Not started`
  - Prisma schema implementation in runtime
  - NestJS module wiring beyond health/bootstrap

## Assumptions
- Fake-money prototype remains the only supported scope in Phase 1.
- One game only in MVP.
- Admin tools can be internal-only and visually simple at first.
- Server-authoritative backend is scaffolded, not fully active yet.

## Open Questions
- Final RTP target within the recommended Phase 1 band
- Final volatility label after expanded simulations
- Whether `3+ Samsara` and `meter full` should both trigger bonus in MVP or only one path initially
- Whether pay-anywhere remains pure cluster adjacency or moves to symbol-count-without-adjacency later

## Change Log
- `2026-03-15`
  - Created initial living PRD
  - Recorded current Phase 1 scope, architecture direction, MVP features, and implementation status
  - Updated implementation status after adding docs, api/admin skeletons, shared contracts, Prisma draft, PixiJS shell, and Zustand shell
- `2026-03-16`
  - Added UI/UX polish scope covering Pixi gameplay renderer, spin state machine, animation modules, and sound feedback
  - Implemented modular player-web presentation layer with Pixi board, spin CTA, control panel, recent rounds formatting, and sound feedback manager
  - Added full gameplay systems and math design direction for engineering implementation
  - Added viewport-fit UI requirement: gameplay-critical elements must remain visible without scrolling
  - Started engine contract and simulation infrastructure pass for deterministic reporting, config versioning, and regression support
  - Completed engine contract, config versioning, deterministic regression tests, and simulation/math-report output foundations
  - Replaced the oversized prototype shell with a compact premium dashboard layout optimized for no-scroll gameplay at Full HD and smaller desktop resolutions
  - Added formal art production pipeline and created first-pass original SVG asset pack definitions under `docs/assets.md`
  - Wired runtime art integration for shell background, board frame, logo, meter icon, and mixed PNG/SVG symbol textures so production assets can be previewed in-game as they are delivered
  - Started gameplay-shell UX pass to unify board and controls, improve thematic typography, add fullscreen behavior, and make wins easier to read directly on the board
  - Completed gameplay-shell UX pass with board-centered controls, fullscreen toggle, themed typography system, and direct sacred path overlays for winning clusters
  - Added a complete simulation-wallet slice with deposit/withdraw flows, local payment methods, wallet ledger history, and first-run welcome credits
  - Added board-level animation polish: symbol hover/breathing, shake before spin, staggered drop/bounce, pooled particles, ambient board motion, big-win rays, and richer synthetic sound presets
  - Improved practical game ergonomics by moving deposit and withdraw next to balance and grouping bet plus autospin directly around the spin CTA
  - Corrected shell art presentation by promoting the logo to a large hero mark and reworking background/frame blending so the scenic backdrop reads properly in-game
  - Promoted the welcome overlay logo to the top of the modal so the intro screen reads as branded game entry instead of generic text-first UI
  - Added a dedicated bonus-entry overlay and stronger bonus visual treatment so entering Sky Opens feels like a clear state transition with explicit free-spin messaging
  - Completed a desktop-first shell cleanup pass covering z-index hierarchy, board dominance, stronger symbol framing, tighter side-panel density, and more reliable typography and control sizing
  - Added a dedicated win presentation layer with pause/acknowledgement handling for round wins, cascade totals, multiplier wins, and bonus-complete summaries
  - Refactored betting and autospin into a wallet-aware control system with balance-based bet validation, risk messaging for high stakes, manual bet entry, manual autospin count, validation messaging, and hard bet locking while autospin is active
  - Expanded the bottom-bar betting UX with direct manual bet entry, sub-euro minimum betting, and fixed `+ / -` ladder navigation across `0.10 -> 0.20 -> 0.50 -> 1 -> 2 -> 5 -> 10 -> 20 -> 50 -> 100 -> 200 -> 500 -> 1000 -> 2000 -> 5000 -> 10000`, while still allowing any manual amount without changing engine math
  - Removed the visible ladder helper copy from the betting bar so the ladder behavior remains available without adding unnecessary UI text
  - Restyled the primary spin CTA as an ouroboros-ring button with `Spin` centered inside the core so the control reads more clearly within the occult game identity
  - Detached the spin CTA visually from the bottom bar height by anchoring it above the control strip center, so the button can protrude vertically without forcing the bar or dock to resize
  - Hardened the player-shell async paths by catching browser-level fullscreen, audio-resume, and Pixi-init rejections so development overlays do not appear from unhandled promise noise
  - Removed the redundant manual-bet `Apply` control so typed bet values now commit on blur, Enter, and before spin/autoplay begins instead of requiring an extra explicit apply click
  - Removed the redundant autospin `Set` control so typed spin counts now commit on blur, Enter, and before autoplay starts, and added clearer spacing between the bet cluster and autoplay cluster in the bottom bar
  - Moved the bet-adjust cluster into its own column directly beside the centered spin CTA so stake editing sits closer to the primary action while autoplay remains separated on the far right
  - Lowered the bet-adjust zone within the bottom bar so its controls align more naturally against the centered spin CTA instead of sitting too high in the strip
  - Increased the right-rail brand logo width to `x1.5` so the branding mark reads more strongly inside the identity panel without changing the rail structure
  - Compacted the left support rail by tightening its column width, block spacing, and internal padding, and raised its stacking ownership so it no longer visually tucks behind the center stage
  - Replaced the bottom-bar `Info` and `Menu` text buttons with deterministic classic icon buttons so utility controls render cleanly without font/encoding issues
  - Split bonus payout UX into dedicated presentation states so bonus entry win, live bonus running total, and final bonus total are always visible near the board and never hidden inside secondary panels
  - Fixed the initial board-render lifecycle so the Pixi board paints correctly on first load instead of waiting for an unrelated wallet/deposit rerender to make symbols visible
  - Rebuilt the desktop shell into a clearer operator-layout split: center column now owns only board-plus-bet-spin controls, while autoplay, utility actions, wallet, and recent history live in the side rails
  - Corrected the desktop shell sizing so the board is constrained by viewport height instead of overflowing below the fold, and rebalanced the scenic/background treatment to better match the board stage
  - Formalized the desktop shell into three owned zones: left support rail, center gameplay stage, and right operator rail, with only bet-plus-spin controls attached to the board and autoplay/account/meta controls moved out of the center stack
  - Rebuilt the under-board play deck into a compact horizontal machine control strip so bet controls, spin, and current-bet summary no longer consume oversized vertical space under the board
  - Reorganized the player shell into a slot-style `left support | center board | right branding` composition with a single bottom gameplay bar so the board remains dominant while controls stay accessible in fixed zones
  - Calibrated the desktop layout around a dedicated bottom machine bar, compact left support modules, and a non-competing right identity rail so the same hierarchy holds in both windowed and fullscreen play
  - Tightened art framing by restoring the production board-frame asset, rebalancing scenic background crop positions, and aligning side-scene cropping so the shell artwork reads consistently instead of cutting key focal areas
  - Increased symbol presence inside the Pixi board with per-symbol fit rules and in-tile masking so SVG and PNG symbol art fills the cells more cleanly with far less dead padding
  - Fixed symbol asset resolution so the runtime now loads symbol `PNG` files first and only falls back to `SVG` when the matching `PNG` is missing or fails to load
  - Added a dedicated production big-win art plate to the win-presentation overlay so large wins use a proper themed backdrop instead of plain card-only emphasis
  - Added a second asset-fit pass after screenshot review: scenic background crop now sits higher and symbol presentation uses stronger per-symbol fill tuning so the SVG-backed icons read larger and cleaner inside the tiles
  - Rolled back the unstable symbol-mask experiment after screenshot review and restored deterministic sprite rendering, then re-centered the bottom control bar around left and right clusters so spacing stays balanced without a large dead zone next to utility actions
- `2026-03-17`
  - Retuned the default engine config to `eye-sky-math-v1.1`, bringing the live fake-money profile into a professional medium-volatility RTP band with materially better bonus cadence and far fewer dead-feeling bonus completions
  - Retuned the live engine again to `eye-sky-math-v1.2`, reducing runaway cascade chains, keeping RTP in a professional band, and exposing a proper in-game paytable so players can see what each winning cluster pays at the current bet
  - Added low-balance deposit prompting so players who enter with less than the minimum stake are guided back into a playable state instead of landing in a silently blocked wallet flow
  - Fixed wallet balance synchronization between the simulation wallet and the spin controller so deposits/withdrawals immediately unlock or relock play without stale balance states
  - Corrected small-win presentation formatting so legitimate low-value wins remain visible as money values instead of being rounded visually down to `0`
