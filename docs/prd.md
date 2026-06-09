# The Eye in the Sky PRD

## Status
- Phase: `Phase 1 fake-money prototype`
- Owner: `Principal Engineer / Game Systems Architect / Product Owner`
- Source of truth: `This file`
- Last updated: `2026-06-01`

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

## Build Reliability Guardrails
- Never run `player-web` build while `player-web` dev server is active.
- Use `corepack pnpm build:player:clean` for local signoff builds.
- If chunk 404/runtime loader errors appear, stop dev, delete `apps/player-web/.next`, and restart dev.
- Build safety is enforced by `apps/player-web/scripts/guard-no-dev-server.cjs`.
- Container startup scripts must be POSIX-`sh` compatible when the image entrypoint uses `/bin/sh` (Alpine). Do not use bash-only syntax such as here-strings (`<<<`) in entrypoint scripts.
- On Windows, `player-web` standalone build can compile successfully and then fail during `.next/standalone` trace copy if symlink creation is blocked (`EPERM`). Treat this as an environment signoff issue and rerun in an environment that permits symlinks instead of disabling `output: "standalone"`.

## Asset Performance Contract
- Runtime player art under `apps/player-web/public/assets/` must be kept web-sized, not source-art-sized.
- Run `corepack pnpm optimize:assets` after replacing non-lite PNG art; the script emits WebP primary assets beside compressed PNG fallbacks and leaves `public/assets/lite/` unchanged.
- High-quality asset sources should prefer WebP, then PNG fallback. Low-quality mode may use the existing `public/assets/lite/` PNG set first.
- Keep symbol source art at or below 512px long edge for runtime delivery; the Pixi board displays symbols far smaller than the original production PNGs.
- Pixi render resolution is capped at DPR 2 to avoid excessive render-target memory on 3x/4x mobile screens.
- Runtime symbol quality may resolve below the saved user preference on phone, low-memory, or small low-DPR contexts; this is a pure asset-source decision and must not change math, layout, or controls. Shell/background assets should keep using the optimized WebP high set unless the user explicitly selects low.
- Low-quality runtime mode may reduce non-critical ambient particle density, but must not alter spin sequencing, win presentation timing, or engine payloads.

## Auth And Guest Session Contract
- Auth API errors use `{ code, message, fieldErrors? }` so the player UI can map failures to exact form fields.
- Public auth codes include `EMAIL_NOT_FOUND`, `WRONG_PASSWORD`, `VALIDATION_FAILED`, `PASSWORD_REUSE`, `INVALID_RESET_TOKEN`, and `RESET_TOKEN_EXPIRED`.
- Password change requires an authenticated session and keeps existing sessions valid.
- Password reset uses a one-time `PasswordResetToken`, rejects reused/current passwords, and invalidates all sessions for the user after a successful reset.
- Non-production forgot-password responses may include the raw reset token for local dev verification; production must deliver the token out of band and must not echo it to the caller.
- Guest mode is client-only, backed by `sessionStorage`, and must not call wallet, round-persistence, welcome-bonus, or bootstrap write endpoints.
- Guest mode may reuse the internal `simulator` runtime branch, but user-facing copy must say `Guest` and persisted guest wallet state must not be stored in localStorage.

## UI Polish Standards
- Support emotion widget: single-line hint text (no second line), compact 40px height, left-aligning dot marker
- CSS class scoping: use dedicated class names to prevent style inheritance (e.g., `.supportEmotionHint` instead of generic `.supportEmotion span`)
- Grid area isolation: use `.` (empty grid cell) to prevent child elements from extending into unintended rows
- Spin CTA identity layers should remain mounted across pulse effects; remount only transient pulse/ripple layers, not the persistent ouroboros ring.
- Utility rail information/settings split: `Info` is read-only game information only (rules, active variant, paytable, special symbols/bonus, FAQ). `Menu` keeps only settings, session actions, and tool entry points. The support rail order is `Menu`, `Info`, `Audio`, `Fullscreen`.

## Presentation Choreography Contract
- Spin presentation is driven by a single conductor: `buildSpinChoreography(result, profile, options)`.
- The conductor may read `SpinResult`, current presentation speed, and nonstop mode, but must never mutate engine results, wallet state, RTP, or round contracts.
- React phases, Pixi board reveals, floating payout text, win/bonus overlays, and synthetic audio cues must be scheduled from the same event stream when a choreography run exists.
- Normal speed target bands: no-win `1.4s-1.8s`, one cascade `2.0s-2.4s`, four cascades `3.4s-4.2s`, and eight cascades `5.2s-6.2s`. Large win tiers may extend the final summary, not every cascade beat.
- First cascade remains fully readable. Cascades 2-3 are shorter but clear. Cascades 4+ use compressed scan, break, payout, and drop beats with a visible running total.
- Synthetic WebAudio remains acceptable for Phase 1, but sound scheduling must stay disabled when sound is off and must not create extra `AudioContext` work.
- Blocking modal state must reflect visible blocking UI. Hidden store flags must not disable gameplay controls.

## Wake Lock Control Contract
- The player shell owns one `useScreenWakeLock()` controller instance and passes it into UI controls that need to reflect or change wake-lock state.
- The toggle must expose `aria-pressed` and visibly different active/inactive icons.
- Native Screen Wake Lock is preferred when available; requestAnimationFrame fallback stays available and visible through the same toggle when native support is missing or denied.

## Responsive Shell Contract
- `player-web` viewport bands are `phone <768`, `tablet 768-1023`, `laptop 1024-1439`, `desktop 1440-1919`, and `wide >=1920`.
- The `useViewport()` hook is the React source of truth for viewport band and orientation; CSS must stay aligned with these bands and may read `data-viewport-band` / `data-orientation` from `.slotViewport`.
- The hook must render the same default viewport on server and first client render, then update after mount, so responsive data attributes do not create React hydration mismatches.
- Phone landscape keeps only the center board plus compact floating dock; side rails are hidden in that band to keep the board visible.
- Tablet/laptop portrait keeps rails visible with a wider bottom support layout instead of using the phone handheld rail compression.
- Shell layering must use named `--z-*` tokens. Do not add raw numeric `z-index` values or inline `calc(var(--z-*) + n)` offsets in active layout rules.
- Narrow phone support-rail controls, including the Samsara eye, must stay fully inside the viewport while preserving the full-width board.

## Olamov Embed Contract
- `player-web` supports iframe mode through `?embed=1`; this trims the shell by hiding the right branding rail while keeping board, left support rail, floating dock, and auth flows active.
- The browser API path remains `/_api`; iframe mode must not bypass the Next proxy or change the session model.
- The player shell sends `frame-ancestors 'self' https://olamov.com https://*.olamov.com` by default. Use `PLAYER_FRAME_ANCESTORS` only for staging parent origins.
- When `COOKIE_SECURE=true`, API auth cookies must be emitted as `SameSite=None; Secure` for third-party iframe login. Default local cookies remain `SameSite=Lax`.
- Safari and Chrome third-party-cookie blocking remains an integration risk; fallback should be top-level login handoff or platform token exchange, not weakening cookie security.

## Repo Hygiene Contract
- PostgreSQL is the active database in current setup docs, env examples, Docker Compose, and Prisma schema.
- Committed env examples must use placeholders only. Real `.env` files remain ignored.
- `docs/` is trackable; only local analysis cache files such as `docs/notes.md` stay ignored.
- Local screenshots, test-results, `.codex/`, `graphify-out/`, and credential reference files remain ignored.
- Documentation links should be repo-relative, not machine-local absolute paths.

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

## Architecture Lessons (API Security Hardening)
- NestJS backend uses schema-based input validation at controller boundaries for all external payloads and critical query params.
- Raw SQL unsafe entry points (`$queryRawUnsafe`, `$executeRawUnsafe`) are prohibited; Prisma ORM and parameterized paths are the default.
- Database and validation exceptions are normalized through a global filter so constraints and integrity violations produce consistent client-safe responses.
- Request throttling is mandatory on auth and wallet mutation routes to reduce abuse and brute-force pressure.

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
- The `Constellation` brief now includes a first-pass locked math direction:
  - target RTP `95.00% - 95.40%`
  - target volatility `medium-high`
  - `count-anywhere` regular wins using `8+ / 10+ / 12+`
  - `Samsara` as scatter
  - `Seraphim Eye` as the only multiplier special
  - ultra-rare multiplier tail up to `x1000`
  - explicit guardrail that the simple variant must be implemented as a new isolated profile, not as a mutation of the current live math variants

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
- `2026-03-26`
  - Added SQL-ready analytics storage architecture in player-web with explicit service abstraction so persistence can move from localStorage to PostgreSQL without UI contract changes.
  - Locked migration path for analytics persistence:
    - Phase 1: local in-app retention and filtering
    - Phase 2: API-backed PostgreSQL persistence with the same query/store contract
  - Fixed integration blocker after abstraction rollout: corrected player-web analytics service import path so `hooks/use-analytics-service.ts` resolves the local storage implementation from `lib/analytics` during Next build/runtime.
  - Completed the frontend API-backed analytics service bridge: authenticated runtime uses the existing `/analytics/*` API contract with local offline fallback, while guest/simulator mode stays client-local and non-blocking.
  - Added an authenticated admin simulation runner contract: large simulations run as capped worker-backed jobs and expose pollable RTP, hit-rate, bonus-rate, and volatility summaries instead of blocking the API request thread.
  - Finalized olamov.com iframe defaults: production compose enables secure cross-site auth cookies, and the player shell exposes `data-embed="1"` while hiding the right branding scene through existing embed mode CSS.
  - Locked the first explicit balancing contract for the simple `Constellation` sub-variant in `docs/variant-simple.md`.
  - Product/math direction for `Constellation` is now:
    - same shell and brand family as the main game
    - `count-anywhere` regular wins on a `6x5` board
    - only `3` regular pay bands (`8+ / 10+ / 12+`)
    - `Samsara` as scatter and bonus trigger
    - `Seraphim Eye` as the only active multiplier special in first pass
    - first-pass multiplier ladder extending from low values (`2x`) to an ultra-rare top tail (`1000x`)
    - target RTP `95.00% - 95.40%` with `medium-high` volatility
  - Locked product rule for future implementation: the simple variant must be added as a third isolated profile with a variant-aware resolver path, without mutating the current `legacy_v1_3` or `math_base_v2_0` runtime behavior.
  - Implemented the first isolated engine foundation for `Constellation`:
    - added third math profile `constellation_simple_v0_1`
    - added variant-aware engine config and win-resolution branching so the current main game continues to use its existing cluster path untouched
    - added first-pass simple special mapping (`Samsara` scatter trigger/pay, `Seraphim Eye` additive multiplier symbol)
    - exposed the new profile in admin/API config selectors for future rollout and simulation work
  - Regression verification for the new engine foundation passed in `@eye/game-engine`:
    - lint
    - full engine test suite
  - First `Constellation` simulation checkpoint confirms that the initial structural baseline is not yet shippable:
    - `100000` spins at bet `1`
    - achieved RTP only `~26.84%`
    - conclusion: architecture is in place, but paytable, symbol weights, multiplier distribution, and scatter cadence still need dedicated tuning before any rollout
  - Completed the first dedicated `Constellation` tuning pass and brought the simple variant into its intended first-pass RTP band.
  - Verified tuned checkpoint:
    - profile: `constellation_simple_v0_1`
    - simulation: `300000` spins at bet `1`
    - achieved RTP: `95.2529%`
    - hit rate: `46.3120%`
    - bonus trigger rate: `0.5906%`
    - average bonus payout: `6.54`
  - Added first player-web variant-awareness for `Constellation` so the product shell no longer misdescribes the simple variant:
    - menu rules/help now switch to count-anywhere + scatter wording
    - paytable table now labels the simple variant as `anywhere` instead of `connected`
    - left support rail replaces the live meter block with a static `Samsara Scatter` rules block in the simple variant
    - hook-level debug/board rules are now variant-aware
  - Completed the first `Constellation` signoff simulation pass on the tuned profile:
    - command: `corepack pnpm --filter @eye/game-engine simulate --profile constellation_simple_v0_1 --spins 1000000 --bet 1 --seed 1337`
    - achieved RTP: `95.2358%`
    - confidence interval: `94.6464% - 95.8252%`
    - hit rate: `46.3143%`
    - bonus trigger rate: `0.5908%`
    - average bonus payout: `6.76`
    - result: first-pass signoff is inside the target `95.00% - 95.40%` band, so the profile is no longer just a structural prototype
  - Extended player-web `Constellation` support into active presentation copy:
    - bonus-entry overlay now describes a scatter-triggered `Constellation` bonus instead of the main game's meter/budget language
    - bonus-complete overlay now reads as `Constellation` completion
    - win-presentation copy now uses `BOARD WIN` / `TUMBLE TOTAL` wording and explicit `Seraphim Eye` settle-multiplier copy in the simple variant
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
  - `Nonstop` contract for bonus banners updated:
    - `Enter Bonus`: normal flow remains manual after the base `1400ms` lock, but with `nonstop` enabled the banner now holds for `2000ms` total and then auto-continues into bonus without button click.
    - `Sky Opens Bonus Complete`: with `nonstop` enabled the completion banner also holds for `2000ms` total and then auto-closes back into base flow without button click.
  - Bonus-announcement input ownership audit completed for `Sky Opens` entry flow.
  - Locked product rule: `BonusAnnouncement` is a hard gate, not a normal presentation overlay.
  - Banner contract is now:
    - `Space` must never dismiss or skip the banner.
    - pointer/gameplay spin intents must never dismiss or skip the banner.
    - autoplay/autocontinue must never advance through the banner.
    - the only permitted keyboard fast-continue path is `F`; before `1400ms` it only queues continuation, and after `1400ms` it may advance without the `Enter Bonus` click.
  - Input-ownership note: `page.tsx` is the keyboard owner for `Space` / `F`; `control-panel.tsx` must not introduce a second `Space` action path on the focused spin button.
  - Failure mode recorded: a previous partial fix changed the global `Space` path but left a local `ControlPanel` keyup path alive, so the banner behavior still looked inconsistent.
  - Testing hotkey exception recorded: held `F` remains intentionally unthrottled for ultra-fast QA spin testing.
  - Known dev/runtime bug recorded: with `F` held down continuously, Next/React dev mode can still surface maximum-update-depth style runtime overlays through the bet-validation/spin path; this issue is currently accepted to preserve the original fast-spin testing behavior.
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
- The unwanted inner/inset frame was not a CSS shell selector. It was the Pixi `runeLayer` pass inside [pixi-temple-board.tsx](../apps/player-web/components/board/pixi-temple-board.tsx), which draws:
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

## Architecture Updates (2026-06-01)
- Auth error contract now intentionally returns typed client-facing codes for internal auth failures:
  - `EMAIL_NOT_FOUND` -> 404
  - `WRONG_PASSWORD` -> 401
  - `EMAIL_TAKEN` -> 409
  - `WEAK_PASSWORD` / `INVALID_DISPLAY_NAME` -> 400
  - zod validation failures keep the existing field-level issue list shape.
- Password change is session-retaining by design: `POST /auth/change-password` rotates only `passwordHash` after current-password verification. Existing `AuthSession` rows remain valid.
- Forgot/reset password uses a DB-backed `PasswordResetToken` model with 30-minute TTL. Non-production responses may include the raw token because no SMTP provider exists; production omits it. Successful reset rotates `passwordHash`, marks the token used, and invalidates all sessions for that player.
- Guest mode is a player-web-only local runtime mode. It uses sessionStorage and in-memory state, never creates `User` / `Player` rows, and must not call player persistence endpoints.
- Olamov iframe integration uses the existing `eye.olamov.com` build. Player-web sends `Content-Security-Policy: frame-ancestors 'self' https://*.olamov.com https://olamov.com`; API CORS allows `https://olamov.com` and `https://eye.olamov.com`; cookies switch to `SameSite=None; Secure` when `COOKIE_SECURE=true`.

- `2026-03-27`
  - Wired live math-profile activation end to end so the admin-selected profile now drives `player-web` at runtime through the API instead of remaining an env-only/static choice
  - Added a dedicated runtime config client hook in `player-web` that fetches `/game-config` on mount, refreshes again when the player tab becomes visible, and performs light visible-only polling so admin changes propagate without restoring static config ownership; env config remains the fallback path if the API is unavailable
  - Replaced duplicated API-side profile metadata with direct `@eye/game-engine` profile registry usage so admin, API, and engine all read from one authoritative config source
  - Refactored `use-slot-machine` to accept the active `GameConfig` as an input instead of reading a module-level static config, making variant-specific labels, paytable/help rows, bonus copy, and spin resolution all runtime-aware
  - Added a guarded gameplay reset when the active config version changes so profile switches do not leave mixed board state, bet state, or bonus presentation state from the previous math model
  - Verification passed for this runtime-switch wiring with `api` typecheck and `player-web` production build; remaining warnings are pre-existing lint warnings unrelated to the profile-switch flow
  - Started identity-layer separation for `Constellation`: the left support rail now renders a dedicated `Samsara Scatters / Constellation Trigger` block instead of a meter-looking block, and the entry/complete bonus overlays now carry their own constellation styling so the variant no longer reads like the base game with only different math underneath
  - Continued the `Constellation` identity pass inside the live shell: the Menu now surfaces an explicit active-variant hero with count-anywhere/scatter cues, section headings rename themselves for the variant, and the right branding rail uses constellation-aware live bonus wording instead of default free-spin copy
  - Cleaned the admin operator surface by replacing the old inline-style profile selector shell with structured CSS-module cards, profile-specific mechanic summaries, and a clearer active-configuration summary so profile switching reads like a real operator tool rather than a temporary debug list
  - Implemented the first SQL Server + authenticated persistence foundation:
    - added `docker-compose.yml` for local SQL Server plus `.env` examples for the database/auth contract
    - switched Prisma from PostgreSQL to SQL Server and normalized structured persistence fields into serialized text so the schema stays compatible with Prisma SQL Server support
    - added DB bootstrap for the primary game row, math-profile registry rows, active profile setting, and an optional seeded admin account
  - Implemented the first real auth/session rollout:
    - added `/auth/register`, `/auth/login`, `/auth/logout`, and `/auth/me`
    - introduced `HttpOnly` cookie sessions with role-aware guards for player/admin access instead of relying on the old loopback/dev-key-only assumption
    - protected operator mutations and analytics reads behind admin auth while leaving the public runtime config read path available to the player
  - Implemented the first server-backed player persistence rollout:
    - added authenticated bootstrap, welcome-bonus claim, deposit, withdrawal, and round-persistence endpoints
    - `player-web` now blocks unauthenticated play behind a login/register overlay and rehydrates wallet plus resumable `GameState` from the API after login
    - round/session/wallet persistence is now pushed back to the API while the actual spin math still runs client-side in v1
  - Implemented the first admin-auth rollout:
    - `admin-web` now requires authenticated admin login before showing the operator surface
    - profile switching and analytics fetches now send authenticated credentials instead of behaving like public/debug-only tools
  - Completed the live SQL Server validation pass for the authenticated persistence rollout:
    - local Docker SQL Server now boots healthy and the real `TheEyeInTheSky` database has been created
    - the initial Prisma migration now applies cleanly against the live SQL Server instance
    - seed now writes the primary game row, all engine profiles, the active profile setting, and the seeded admin account into the live DB
    - manual HTTP smoke passed for player registration, session cookies, authoritative bootstrap, welcome bonus, deposit, withdrawal, round persistence, and resumable session state
    - manual HTTP smoke also passed for admin login and admin-only profile switching, while non-admin users are correctly rejected from `/game-config/select`
  - Added post-smoke hardening for the authenticated persistence path:
    - `/player/rounds` is now idempotent by `roundId`, so duplicate client submissions no longer replay wallet/ledger mutations
    - a repeatable local SQL/auth smoke script now exists at `scripts/sql-auth-smoke.ps1`
  - Recorded one remaining local-runtime caveat for the API:
    - the reliable local smoke path currently uses `corepack pnpm --filter api exec node --import tsx dist/apps/api/src/main.js`
    - this is a temporary monorepo workspace-resolution workaround for `@eye/game-engine` source imports and should be cleaned up in a follow-up packaging/runtime pass
  - Added a dev-only `Skip Login` simulator path in `player-web`:
    - the auth overlay now exposes `Skip Login` only outside production
    - simulator mode bypasses auth and all server-backed player persistence calls
    - simulator keeps only local wallet-money continuity and intentionally drops persisted stats/history/resumable game state
    - a visible lightweight simulator badge lets the operator return to the real login flow
