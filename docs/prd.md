# The Eye in the Sky PRD

## Status
- Phase: `Phase 1 fake-money prototype`
- Owner: `Principal Engineer / Game Systems Architect / Product Owner`
- Source of truth: `This file`
- Last updated: `2026-03-23`

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
- Keep room for in-world gameplay variants that reuse the same shell and identity without fragmenting the product.

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

## UI Workflow Guardrails
- Read `docs/prd.md` and `docs/tasks.md` before touching the board shell or footer geometry.
- For risky board/footer CSS experiments, keep the previous working block commented or isolated until the replacement is verified.

## Delivery Logging Protocol
- Every change touching board presentation, spin flow, or animation timing must be recorded in `docs/tasks.md` Change Log the same day.
- Permanent operating rule: every meaningful implementation change must be recorded in both `docs/tasks.md` (execution log) and `docs/prd.md` (product/architecture impact), without exception.
- Every implementation pass must include a short step record in this order:
  - `Intent`: what behavior we are changing.
  - `Hypothesis`: why the current behavior is wrong.
  - `Code change`: exact file and logic touched.
  - `Verification`: what was tested and what outcome was observed.
  - `Rollback note`: what to revert if the change regresses UX.
- Never batch unrelated animation edits in one pass. One issue -> one isolated change -> verification -> log update.
- If a fix fails, the failed hypothesis must still be logged as `Rejected` to prevent repeating the same attempt.

## Architecture Lessons (Phase 1 Critical Findings)

### State Coupling Hazard: Logging + Visual Dispatch
**Incident**: Extended investigation (3+ weeks) into "extra spin effects" during idle state revealed that the root cause was **implicit coupling between `phaseMessage` updates and effect triggers** in `use-slot-machine.ts`. Every ritual log write was concurrently updating state in a way that inadvertently triggered spin effects. This was NOT a pure animation bug in the presentation layer — it was a state-management side-effect in the gameplay orchestration hook.

**Pattern to avoid**:
```
// ❌ WRONG: State update drives both logging AND visual side-effect
setPhaseMessage(newMessage); // <-- Triggers effect?
// If setPhaseMessage's parent useEffect also dispatches animation, we have coupling.
```

**Correct pattern**:
```
// ✓ CORRECT: Separate logging lifecycle from visual state dispatch
// 1. Update message for UI display
setPhaseMessage(newMessage);

// 2. Visual effects are driven ONLY by explicit phase transitions,
//    never as a side-effect of message updates
// Phase transitions go through the spin state machine, not through logging
```

**Mitigation**:
- Logging (phaseMessage, ritual log, debug output) is a **read-only concern**. It must never be in the critical path of state changes that drive visual effects.
- Spin phase transitions should be the ONLY driver of visual effects. If a state change is not explicitly a spin phase transition, it should not trigger animation.
- If you find that "logging updates are causing visuals to break," the bug is almost certainly a coupling issue, not an animation timing issue. Separate the concerns immediately.
- Test logging systems independently from effect systems — use a debug mode that logs without rendering, and verify effects without logging.

## Architecture Lessons (Samsara Economy Pass)
- Samsara economy is now budget-driven, not symbol-count-only.
- Each base-mode Samsara hit contributes the current bet amount into `samsaraCollectedBets`.
- Bonus entry derives a fixed bonus stake as `samsaraCollectedBets / 7` and this fixed stake is used for all 7 free spins.
- Bonus meter remains visually full at `17` during active bonus and resets with the collected budget when bonus completes.
- Engine remains source-of-truth for bonus stake to prevent frontend stake manipulation during free spins.

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
- Current tuned runtime profile: `eye-sky-math-v1.3`
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
- unrestricted autoplay count that stops naturally when balance can no longer fund the next spin
- simulation tooling
- first-pass original art asset pack for symbols, UI frame, logo, and atmospheric background
- welcome ritual overlay with first-run bonus credits
- 4-tier win presentation system: WIN / BIG WIN / HUGE WIN / SUPER WIN with progressive glow, dedicated plates, and staged audio
- session analytics dashboard: running RTP trend, win tier distribution, cascade histogram, balance history, CSV export
- keyboard shortcuts for gameplay (Space, +/-, W/S/A/Q)
- autospin infinite mode (A key to start, Q to stop)

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

## Dev Environment Port Assignments
- `3000` — `player-web` (game client)
- `3100` — `admin-web` (operator panel)
- `3200` — `api` (NestJS, default via `process.env.PORT`)

Run `pnpm dev:apps` to start player + admin in parallel. Run `pnpm dev:api` separately.

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
  - richer synthetic sound manager with layered tones, optional stereo pan, and dedicated super-win preset
  - future-proof player-web folder structure with grouped components, gameplay hooks, state/assets libraries, and local README indexes
  - 4-tier win presentation system (WIN / BIG WIN / HUGE WIN / SUPER WIN) with per-tier plates, progressive glow intensity, and separate audio routing
  - Samsara meter visual FX progression: dark → gold → critical red/blink based on meter fill ratio
  - ritual log expanded to last 100 rounds with chevron toggle and scrollable viewport-anchored area
  - EUR compact wallet formatting in HUD and modal confirmations
  - session analytics dashboard in player-web: RoundAnalyticsEntry tracking (up to 1000 rounds persisted to localStorage), SVG charts (RTP trend, win tier distribution, cascade histogram, balance history), CSV export
  - `RoundAnalyticsEntry` and `RoundAnalyticsTier` types added to `packages/shared-types` for SQL migration readiness
  - Phase 2 telemetry foundation: API endpoints `POST /analytics/ingest`, `GET /analytics/summary`, `GET /analytics/rounds`, `GET /analytics/dashboard`, `DELETE /analytics/reset`
  - Phase 2 persistence bridge (pre-SQL): API persists analytics entries into local JSON runtime store so telemetry survives API restarts during dev
  - Prisma schema now includes `AnalyticsRound` model as SQL migration target for next persistence step
  - player-web now emits best-effort round analytics to API without blocking gameplay; admin-web now polls live analytics summary every 5 seconds
  - control UX hardening: spin and autoplay control area is non-selectable/non-editable, and autoplay supports 3-second long press for immediate infinite mode
  - admin QA win tier preview popup with actual plate assets and game-identical typography
  - keyboard shortcuts: Space (spin), +/- (bet), W/S (bet up/down), A (infinite autospin), Q (stop)
  - fixed dev port assignments: player-web=3000, admin-web=3100, api=3200
  - `dev:apps` pnpm script to start player + admin in parallel
  - CSS cleanup in progress toward single authoritative selector blocks with variable-driven desktop-band overrides
- `In progress`
  - PRD-driven repo alignment
  - Zustand gameplay store migration
  - Tailwind integration
  - painted production asset generation pipeline for symbol suite, background, frame, and bonus splash
  - research and design definition for a simpler `count-anywhere` Eye variant that reuses the main shell
- `Not started`
  - Prisma schema implementation in runtime
  - NestJS module wiring beyond health/bootstrap

## Verified Working Tree Differences Vs Latest Commit
- `README.txt` is removed from the root and a new root `README.md` exists.
- The previous flat `apps/player-web/components/*.tsx` files are absent from their old paths in the current working tree.
- New grouped component folders exist under:
  - `apps/player-web/components/board`
  - `apps/player-web/components/controls`
  - `apps/player-web/components/debug`
  - `apps/player-web/components/layout`
  - `apps/player-web/components/modals`
  - `apps/player-web/components/presentation`
  - `apps/player-web/components/archive`
- The previous hook path `apps/player-web/hooks/use-slot-machine.ts` is absent and a new grouped path exists at `apps/player-web/hooks/gameplay/use-slot-machine.ts`.
- The previous library paths `apps/player-web/lib/asset-manifest.ts` and `apps/player-web/lib/player-store.ts` are absent and new grouped paths exist at:
  - `apps/player-web/lib/assets/asset-manifest.ts`
  - `apps/player-web/lib/state/player-store.ts`
- New local index files exist at:
  - `apps/player-web/README.md`
  - `apps/player-web/components/README.md`
  - `apps/player-web/hooks/README.md`
  - `apps/player-web/lib/README.md`
  - `docs/INDEX.md`
  - `packages/game-engine/README.md`
- `apps/player-web/tsconfig.json` is modified and now includes local alias configuration for `@/*`.
- The currently modified tracked files in the working tree are:
  - `.gitignore`
  - `apps/player-web/app/globals.css`
  - `apps/player-web/app/page.tsx`
  - `apps/player-web/tsconfig.json`
  - `docs/architecture.md`
  - `docs/prd.md`
  - `docs/tasks.md`

## Current Verified UI Work Remaining
- The active shell CSS is still being refactored so the center board uses one authoritative sizing model instead of scattered selector overrides.
- The center board is still being re-expanded so `boardFrameMain` occupies the intended full center playfield between the left and right rails.
- The mini-stat strip is being kept as an overlay layer above the board instead of a row that permanently consumes board height.
- The footer remains an overlay bar and the board is being kept visually above it through z-index ownership and overlap rules.
- The scenic background is being calibrated together with the board footprint so the background remains visible behind the expanded playfield instead of disappearing under dead center-stage space.
- Verified from the latest screenshot comparison: the `2K` presentation is closer to the intended target than `1920x1080`; the `1920x1080` board still leaves too much empty space around the center playfield.
- Explicit board-footprint target, recorded from the latest user instruction: on `1920x1080`, the board should sit almost flush with the mini-stat strip above it and nearly touch the left rail, right rail, and footer below while remaining fully visible at browser zoom `100%`.
- Explicit zoom-behavior target, recorded from the latest user instruction: browser zoom should scale the board more uniformly with the rest of the shell instead of making the surrounding UI feel closer while the board shrinks or drifts differently.
- Explicit portrait-monitor target, recorded from the latest user instruction: on `1920x1080` screens used in vertical orientation (`9:16`), rails must remain visible through a dedicated portrait layout, and the board must scale up instead of collapsing into a small center footprint.
- Latest dual-screenshot portrait finding, recorded from direct comparison between a phone viewport and a vertically oriented desktop monitor:
  - both portrait surfaces must read as the same shell design, not as two different responsive inventions
  - target shared composition is:
    - top-center brand logo
    - board directly below the logo as the dominant center element
    - lower-left support stack led by `Treasury` and `Ritual Log`
    - lower-center compact status stack (`Balance / Bet`, `Round Status`, `Samsara`, utility icons) without overlapping the board
    - lower-right spin dock with spin CTA visually tied to the bet/autoplay controls
  - allowed variance between phone portrait and vertical monitor portrait should be only scale/compression, not ownership or ordering changes
  - if space becomes tight, the shell may compress modules, but it must preserve the same reading order and left/center/right ownership
  - mobile portrait should not become a special alternate design that diverges from the `9:16` vertical monitor shell
- Latest screenshot-based issue summary:
  - the phone layout is currently much closer to the intended shared portrait shell
  - the vertical-monitor portrait view currently drifts too far toward a desktop board-only composition, leaving the board dominant but not preserving the same lower-zone module arrangement
  - the active CSS responsive logic is still too coupled, so edits for phone portrait can unintentionally perturb vertical-monitor portrait and vice versa
  - the next responsive pass must treat `phone portrait` and `vertical monitor portrait` as siblings under one portrait design language, with isolated calibration knobs rather than cross-impacting overrides
- Current visual direction for the board-top stat strip: `Round / Cascades / Free Spins` should stay readable but use a translucent glass-like surface so the enlarged board remains visible behind them.
- Current visual direction for `100%` browser zoom: after the aggressive enlargement pass, the board now needs slight reduction and a slightly lower placement so it remains fully visible without top or bottom crop.
- Additional responsive target bands now required for board geometry:
  - `2560x1440`
  - `2868x1320`
  - vertical / portrait `9:16`
  - dual-screen style wide usage where the game still needs a stable center-board footprint
- Responsive handling should be based on `width + height + aspect ratio` bands, not naive single-width breakpoints.
- CSS organization direction is now explicit: the shell should be split into focused active stylesheets (`globals`, `main-board`, `footer-controls`, `rails`, `overlays`) instead of continuing to grow one monolithic file.
- Before freezing the current UI as the pre-refactor backup, the active shell still must satisfy three non-negotiable desktop-first checks:
  - all footer and left-rail controls remain clickable without z-index hacks on the footer shell
  - the footer reads as separated left/right control clusters with a clear open center lane for the board/spin relationship
  - the board gap/background treatment remains intentionally transparent enough that the scenic backdrop is still visible behind the symbol field
- Current desktop hierarchy direction:
  - the center stage should contain only the board footprint and board-local visual layers
  - the current board footprint is now treated as the accepted desktop target and should not be re-expanded casually
  - the compact left support block directly under `Treasury` should use the same `Balance / Bet` summary previously shown in the footer
  - the support-rail utility icons belong at the bottom of the left rail in one clean horizontal row, not in the left footer cluster
  - `Round / Cascades / Free Spins` should live in the left support rail above the `Samsara` block instead of occupying board-top space
  - the `Spin` CTA should live in the open right-side lane above the bet/autoplay controls, not inside or behind the board footprint
  - on larger-than-`1920x1080` desktop bands, the right branding scene should scale up with the viewport instead of staying locked to the Full HD footprint
  - the spin CTA should sit slightly lower and read as visually tied to the autoplay controls, not as a detached floating object
  - the board shell should avoid stacked decorative frame layers; current direction is to collapse the board into one holistic frame treatment instead of multiple CSS and Pixi frame/glow layers
  - keyboard ergonomics should support `Space = spin`, `+ = increase bet`, and `- = decrease bet` whenever no blocking modal or text input is active
  - the deposit modal must support typed custom amounts in addition to quick preset chips
- Current portrait hierarchy direction from the latest screenshot comparison:
  - portrait layouts should preserve one consistent semantic shell across both `phone portrait` and `1920x1080 vertical monitor`
  - the logo should remain centered above the board in both portrait targets
  - the board should stay directly under the logo and should not drift so far down or up that the portrait shell reads differently between devices
  - `Treasury` must sit above `Ritual Log` in the left-lower support column
  - the middle-lower stack should hold compact `Balance / Bet`, `Round Status`, `Samsara`, and utility icons in a centered column
  - the right-lower lane should hold the spin dock and its controls as one cluster
  - the handheld portrait `Spin` CTA should use a smaller physical size than the vertical-desktop portrait CTA
  - the handheld portrait spin-size change must be applied from the active portrait responsive ownership file that controls the dock sizing (`responsive-portrait.css`), not from lower-priority or dead-end overrides in unrelated stylesheets
  - these portrait modules must avoid overlap with the board; compression is allowed, ownership changes are not
  - portrait tuning must be isolated by viewport band so a change for one portrait target does not accidentally deform the other

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

## Continuation Handoff
Use this section as the operational handoff for the next chat so work can continue without re-discovery.

### Authoritative UI Files
- `apps/player-web/app/globals.css`
  - owns global tokens, shared shell variables, footer shell, rails, and non-board shell styling
- `apps/player-web/app/main-board.css`
  - owns active main-board geometry, board-local overlays, board responsive sizing, and board-top mini-stat presentation
- `apps/player-web/app/layout.tsx`
  - imports `globals.css` first and `main-board.css` second, so board overrides are intentionally layered after the global shell
- `apps/player-web/app/page.tsx`
  - composes the live shell structure:
    - `LeftSupportRail`
    - `centerStage`
    - `StageStatusStrip`
    - `boardShell`
    - `boardFrameMain`
    - `RightOperatorRail`
    - `bottomControlsDock`

### Current Board Ownership
- The main board is no longer supposed to be tuned from scattered rules inside `globals.css`.
- The active board geometry work should happen in `apps/player-web/app/main-board.css`.
- `main-board.css` currently controls:
  - `--machine-stage-columns`
  - `--machine-stage-gap`
  - `--stage-status-width`
  - `--board-frame-fit-height`
  - `--board-frame-margin-bottom`
  - `.boardMetaRow`
  - `.boardShell`
  - `.boardFrameMain`
  - `.miniStat`
  - board-specific responsive overrides

### Current Verified Board State
- The old `100% browser zoom` collapse bug was caused by a legacy `max-height: 768px` shell breakpoint creating a two-row viewport split.
- That collapse is now explicitly overridden in `main-board.css`, so the board is visible again at browser zoom `100%`.
- The board is currently intentionally larger than before and is now being fine-calibrated rather than rebuilt again from scratch.
- The board-top mini stats (`Round / Cascades / Free Spins`) are now moving toward a translucent glass treatment instead of opaque solid cards.

### Current UI Target
- On `1920x1080`, the board should be large and close to:
  - the mini-stat strip above
  - the left rail
  - the right rail
  - the footer below
- The board should remain fully visible at browser zoom `100%`.
- The board should sit visually in front of the footer through z-index and overlap.
- The board should feel centered and should not crop badly at the top or bottom.
- The `2K` presentation is currently closer to the desired result than the `1920x1080` presentation.
- Browser zoom should scale the board more uniformly with the rest of the shell instead of making the shell feel closer while the board shrinks or drifts differently.

### Responsive Scope That Must Be Supported
- `1920x1080`
- `2560x1440`
- `2868x1320`
- portrait `9:16`
- very wide / dual-screen style desktop usage

Responsive handling should be based on:
- width
- height
- aspect ratio

and not only on naive width breakpoints.

### Current Workflow Rules
- Read `docs/prd.md` and `docs/tasks.md` before touching board or footer geometry.
- For risky CSS experiments in board/footer layout:
  - keep the previous working block commented or isolated
  - activate the new block
  - verify the new result
  - only then delete the old block
- For board work, prefer changing only `main-board.css` unless the issue is proven to come from shared shell variables in `globals.css`.
- For CSS-only tweaks, avoid unnecessary build/test churn unless the change touches shared layout contracts in TypeScript.

### Known User Preferences That Must Not Be Lost
- The user wants the board as large as possible without broken crop.
- The user prefers direct, practical fixes and gets frustrated by repeated “explanations” without visible effect.
- The user wants docs kept updated continuously, especially PRD/tasks.
- The user wants important reference examples recorded in docs when they are useful for math/UI tuning.
- The user explicitly asked that the PRD contain enough context so a new chat can continue without uncertainty.

### Benchmark / Reference Notes Already Captured
- A user-provided strong slot reference was recorded in `docs/game-math.md` as a benchmark for:
  - pay-anywhere payout-ladder readability
  - three-band symbol-count structure
  - separate scatter explanation
  - mobile-friendly rules/paytable presentation
- The same benchmark note now also includes the approximate visible payout pattern from the user-provided screenshot:
  - regular symbols grouped into `8-9`, `10-11`, and `12-30`
  - clear high / mid / low symbol value separation
  - separate scatter block paying on `4`, `5`, and `6`
- This benchmark is recorded as a quality reference, not a direct copy target.
- A dedicated design brief for the simpler Eye sub-variant now exists at `docs/variant-simple.md`.
- Recommended working name for the first simple variant: `The Eye in the Sky: Constellation`.

### Current Logical Next Steps
1. Stabilize the `1920x1080` board footprint in `main-board.css`.
2. Then split the remaining shell CSS into focused files:
   - `footer-controls.css`
   - `rails.css`
   - `overlays.css`
3. Then calibrate dedicated bands for:
   - `2560x1440`
   - `2868x1320`
   - `9:16`

## Change Log
- `2026-03-24`
  - Bonus economy model upgraded from fixed bonus stake to managed budget pool: bonus state now carries `initialBonusBudget`, `remainingBonusBudget`, and `preBonusBet`; exiting bonus restores the exact pre-bonus base bet.
  - Bonus bet control updated: during bonus, player may set per-spin bet within remaining `Samsara` budget; default remains equal split, and final bonus spin forces all-in on remaining budget to avoid stranded value.
  - Bonus edge-case UX contract updated: exhausted bonus budget keeps free-spin sequence running at `0.00` bet for board reveal only; messaging now explicitly communicates `0.00 x 100 = 0.00` style outcomes.
  - `Bonus Entry Win` definition locked to total collected `Samsara` pool (`initialBonusBudget`) for both gameplay and QA preview surfaces.
  - `Samsara` collection during active bonus is now retained as carryover for the next bonus cycle instead of being discarded.
  - Admin live analytics reliability update: dashboard polling now uses timeout + backoff + single-flight scheduling to prevent repeated loading/failure oscillation.
  - Admin QA tooling expanded: added one-click `Sky Opens` preview panel that opens the same bonus-entry composition on demand.
  - `Sky Opens` input-freeze rule reinforced: bonus-entry banner now enforces a mandatory `1400ms` visibility/interaction lock window before `Enter Bonus` can unlock.
  - Root-cause timing fix for missing `Sky Opens` banner: the bonus announcement had been scheduled later than the trigger spin's `ROUND_END/IDLE` transition because `bonusTrigger` hold (`~545ms`) was shorter than the extra reveal delay (`1100ms`). The banner now fires with no extra cinematic delay, and bonus-mode visuals stay suppressed while the announcement is on screen so the player reads the banner before the bonus shell activates.
  - Entry-flow gating strengthened again: the UI now uses an explicit `bonusEntryPending` state from the moment the trigger spin resolves into bonus, freezing normal bonus visuals and interaction until the `Sky Opens` announcement has actually been shown and acknowledged/fast-continued.
  - Bonus-announcement input ownership audit completed for `Sky Opens` entry flow.
  - Locked product rule: `BonusAnnouncement` is a hard gate, not a normal presentation overlay.
  - Banner contract is now:
    - `Space` must never dismiss or skip the banner.
    - pointer/gameplay spin intents must never dismiss or skip the banner.
    - autoplay/autocontinue must never advance through the banner.
    - the only permitted keyboard fast-continue path is `F`; before `1400ms` it only queues continuation, and after `1400ms` it may advance without the `Enter Bonus` click.
  - Input-ownership note: `page.tsx` is the keyboard owner for `Space` / `F`; `control-panel.tsx` must not introduce a second `Space` action path on the focused spin button.
  - Failure mode recorded: a previous partial fix changed the global `Space` path but left a local `ControlPanel` keyup path alive, so the banner behavior still looked inconsistent.
- `2026-03-23`
  - Bonus atmosphere choreography update: entering bonus now triggers a short cinematic quake + lightning shell effect, and exiting bonus now transitions back to base state with smooth visual settle.
  - Implemented dual-layer backdrop crossfade for base/bonus background swaps to remove abrupt transitions.
  - Bonus integrity fix: Samsara trigger now awards only one free-spin bundle per base trigger spin, preventing accidental over-award from additional cascades in the same spin resolution.
  - Added regression test coverage for single-bundle bonus awarding behavior.
  - Corrected bonus-trigger overlay composition by decoupling it from generic modal header/body layout rules; content now uses dedicated centered structure with stable alignment.
  - Removed remaining logo usage from legacy bonus-entry overlay path to keep bonus-trigger presentation consistently logo-free.
  - Bonus-trigger modal UX update: removed logo from the `Bonus Triggered` overlay, centered content composition, and replaced loose text with clearer structured bonus information rows.
  - Bonus atmosphere update: while `Sky Opens` bonus mode is active, the full shell backdrop now switches from base temple sky art to the bonus `open sky` background.
  - Interaction polish: win and bonus presentation banners are now non-selectable (`user-select: none`) to prevent accidental text highlight during fast spin input.
  - Input behavior parity update: Spin button click now uses the same interrupt flow as `Space` (dismiss current presentation overlays and continue spinning immediately).
  - Removed additional mouse-only spin throttle to support fast click cadence consistent with keyboard flow.
  - Updated spin presentation pacing target to approximately `1000ms` total on the standard (single-cascade, non-bonus) path, keeping animation phases smooth rather than abrupt.
  - Reduced post-break win-banner delay to align final result reveal with the faster timeline target.
  - Updated cascade pre-break behavior to a faster profile: winning cells now flash exactly `2` times and then break immediately.
  - Reduced per-cascade highlight window (`winHighlight`) to speed up overall cascade cadence while keeping phase ordering deterministic.
  - Presentation timing update: cascade break/highlight stage is now fixed to `1.0s` per cascade for clearer readability.
  - Win banner presentation is now scheduled strictly after the final cascade break timeline completes (with additional safety buffer) to prevent early overlay appearance.
  - Added explicit Samsara meter context interaction: clicking the Samsara eye now opens a context window that lists per-spin contribution amounts collected into the meter.
  - Added engine-level `samsaraContributionLog` in `GameState` so UI breakdown uses deterministic round data, not inferred frontend approximations.
  - Updated bonus-entry spin handling so the base spin that triggers `Sky Opens` is not incorrectly consumed as a free spin in the same resolution cycle.
  - Added persisted snapshot normalization for `samsaraContributionLog` to keep legacy localStorage payloads backward-compatible.
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
- `2026-03-18`
  - Retuned the live engine to `eye-sky-math-v1.3`, lowering the Samsara meter target to `16`, keeping the RTP target in a professional band, and making the bonus cadence feel healthier without reverting to pathological cascade depth
  - Reorganized the `player-web` app into future-proof folders for `board`, `controls`, `layout`, `modals`, `presentation`, `debug`, `hooks/gameplay`, `lib/assets`, and `lib/state`, and added local README indexes so another engineer can navigate the codebase faster
  - Restored PRD-first documentation discipline by resuming updates to the living docs after meaningful shell, math, and structure changes
  - Changed autoplay so players can request any positive spin count and autoplay now stops naturally only when balance can no longer pay for the next spin, instead of blocking large counts up front
  - Started a real CSS-governance cleanup for the active game shell so key layout selectors such as `stageStatusStrip`, `boardFrameMain`, `machineBottomBar`, and `balanceZone` are defined once and desktop breakpoints adjust only variables instead of scattering repeated selector overrides through the file
  - Added a factual PRD audit section for the current working tree, listing the moved `player-web` folders, the new README indexes, the moved hook/library paths, and the currently modified tracked files
  - Continued the active board-shell fix by keeping the mini-stat strip as an overlay layer and pushing `boardFrameMain` toward a full-height center-stage footprint above the footer overlay
  - Continued the center-board geometry pass by moving the mini-stat strip to an absolute overlay, letting the center stage overflow visibly, and restoring a height-first `boardFrameMain` fit inside the full center playfield
  - Replaced the unstable percentage-height board sizing with a viewport-height-driven board width fit so `boardFrameMain` scales from the available vertical playfield instead of collapsing at normal browser zoom
  - Split the active main-board shell rules into a dedicated `apps/player-web/app/main-board.css` file, imported after `globals.css`, so center-board geometry can be tuned in one isolated stylesheet instead of being scattered through the global shell file
  - Verified from desktop screenshots and CSS inspection that a legacy `max-height: 768px` shell breakpoint was still forcing `slotViewport` into two rows; the active `main-board.css` now overrides that breakpoint and forces `gameArea.machineStage` to span the full viewport grid
- `2026-03-19`
  - Recorded the current board-footprint target from the latest `1920x1080` and `2K` screenshot set, including the requirement that the board nearly touch the mini-stat strip, side rails, and footer while staying fully visible at browser zoom `100%`
  - Recorded the active UI workflow rule for board/footer work: read the PRD/tasks first and keep risky CSS replacements isolated or commented until the new block is verified
  - Continued the isolated `main-board.css` calibration by narrowing the shell rails, increasing the viewport-height board fit, and wiring `--board-frame-margin-bottom` into the live board footprint so the board can overlap the footer as an intentional foreground layer
  - Calibrated the current enlarged-board pass back toward a safer `100%` footprint: the board-top stat chips now move toward a translucent glass treatment and the board fit was reduced slightly and lowered to avoid visible crop while preserving the larger-shell direction
  - Documented the board-frame isolation findings: the intrusive inset frame was the Pixi `runeLayer` inner rounded-rectangle/corner-stroke pass, while the CSS `boardFrame`, CSS `boardFrame::after`, CSS `boardStageHalo`, and the larger Pixi `frame` mapped to other accepted shell layers

## Board Frame Layer Findings
- The unwanted inner/inset frame was not a CSS shell selector. It was the Pixi `runeLayer` pass inside [pixi-temple-board.tsx](/c:/Projects/MyTests/Tsogos/apps/player-web/components/board/pixi-temple-board.tsx), which draws:
  - one inner rounded rectangle
  - four short corner lines
- The larger Pixi `frame` in the same file is a different layer. In screenshot isolation it mapped to the accepted outer/yellow frame, not the intrusive inset frame.
- The CSS shell layers were isolated and are now explicitly documented as separate concerns:
  - `boardFrame`: main outer shell / red boundary
  - `boardFrame::after`: inner vignette/darkening layer
  - `boardStageHalo`: ambient glow bed behind the board
  - `boardArtFrame` / `boardBonusArt`: currently disabled decorative art layers
- Debugging rule for future shell work:
  - isolate one layer at a time
  - restore the previous layer before testing the next one
  - keep code comments on board-layer ownership so shell debugging does not restart from zero
