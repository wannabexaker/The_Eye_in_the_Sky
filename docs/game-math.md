# Game Math

## Status
- Current phase: `system design locked, v1.2 tuning pass applied`
- Confidence level: `medium-high for design, medium-high for reporting structure, medium-high for achieved RTP pending longer signoff runs`
- Last updated: `2026-03-17`
- Latest audit note: `eye-sky-math-v1.2` replaces the over-chaining v1.1 profile with a more professional cluster-cascade cadence: deterministic validation measured roughly `94.99% RTP` over `100k` spins and `94.62% RTP` over `500k` spins, hit rate around `47.7%`, bonus trigger cadence around `1 in 288`, and cascade depth now capped at `12` to eliminate pathological `50+` chain outcomes

## Design Intent
`The Eye in the Sky` must feel eventful, fair, and legible. Excitement should come from:
- visible cluster chains
- meaningful cascade continuation
- occasional multiplier spikes
- clear bonus buildup
- coherent bonus value

The game must not rely on deceptive near-miss behavior, hidden steering, or dark-pattern reinforcement loops.

## Board Model
- Grid: `6 columns x 5 rows`
- Total cells: `30`
- Win type: `cluster pays`
- Connectivity: `orthogonal only`
- Minimum winning cluster size: `4`
- Win lifecycle:
  1. generate board
  2. resolve modifier pre-effects
  3. detect winning clusters
  4. compute payout
  5. remove winning symbols
  6. collapse board top-down
  7. refill from weighted symbol distribution
  8. re-run until no further wins

## Symbol Taxonomy
### Low Symbols
- Ashen Sigil
- Broken Halo
- Ritual Dagger
- Sealed Scroll

Design role:
- primary fill density
- support frequent small and medium clusters
- stabilize hit rate

### High Symbols
- Seraphim Feather
- Burning Crown
- Ophidian Relic
- Celestial Gate

Design role:
- lower appearance frequency
- higher payout concentration
- larger contribution to volatility

### Special Symbols
- Seraphim Eye
- Samsara
- Ouroboros
- Panepoptis Ophthalmos

Design role:
- create event states rather than direct baseline value
- shift round EV distribution
- support round differentiation

## Mathematical Model Design
The model should be treated as the sum of four layers:

1. `Base symbol EV`
   Determined by low/high symbol density, cluster probability, and paytable.
2. `Cascade EV`
   Determined by post-win refill density and cascade ladder scaling.
3. `Special symbol EV`
   Determined by modifier frequency and incremental effect value.
4. `Bonus EV`
   Determined by trigger rate x average bonus payout.

Target equation:

`RTP_total = RTP_base + RTP_cascade_lift + RTP_special + RTP_bonus`

Each layer should be measurable independently during simulation.

## Symbol Weight System
Use weighted random selection from rarity tiers.

### Recommended Rarity Tiers
- `Common`
  - Ashen Sigil
  - Broken Halo
  - Ritual Dagger
  - Sealed Scroll
- `Uncommon`
  - Seraphim Feather
  - Burning Crown
- `Rare`
  - Ophidian Relic
  - Celestial Gate
- `Event`
  - Seraphim Eye
  - Samsara
- `Ultra Rare`
  - Ouroboros
  - Panepoptis Ophthalmos

### Weighting Strategy
Do not tune per symbol in isolation. Tune by bands:
- common band controls hit rate
- high-symbol band controls value density
- event band controls round texture
- ultra-rare band controls spike frequency

### Recommended Tuning Order
1. Set common density high enough to maintain cluster formation.
2. Add high symbols until medium-win frequency feels present.
3. Add Samsara rate until bonus trigger band is acceptable.
4. Add Seraphim Eye until base game has visible eventfulness.
5. Add Ouroboros/Panepoptis sparingly to control volatility spikes.

## Paytable Design
### Design Rule
Paytable should reward larger clusters with nonlinear lift, but not so steeply that a single common-symbol mega-cluster dominates RTP.

### Benchmark Reference Note
Keep the following external benchmark pattern in mind during future paytable tuning and paytable UI design.

User-provided reference from a strong modern `pay-anywhere` slot shows this structure:
- visible symbol-by-symbol payout table
- three clear symbol-count bands:
  - `8-9`
  - `10-11`
  - `12-30`
- high symbols with much stronger top-band payout than low symbols
- scatter explained separately as its own rule block
- payout values presented in clean descending tiers, easy to scan on mobile

This should be treated as a quality benchmark for:
- payout ladder readability
- symbol-value hierarchy
- concise rules presentation
- mobile-friendly paytable layout

It is a reference example, not a direct copy target.

### Suggested Shape
- cluster `7`
  - entry payout
- cluster `8`
  - meaningful but modest step-up
- cluster `10`
  - clear excitement threshold
- cluster `12+`
  - major win threshold

### Benchmark-Informed Ladder Direction
The referenced strong-slot example uses larger count bands instead of many tiny count steps. That pattern is worth preserving conceptually:
- entry band
- mid band
- top band

For `The Eye in the Sky`, keep a similarly legible ladder philosophy:
- one clear lower band
- one clear mid band
- one clear top band

The exact thresholds can differ from the benchmark, but the structure should stay easy to understand and communicate.

### Paytable Philosophy
- low symbols should mostly support small-to-mid wins
- high symbols should generate the more memorable base-game payouts
- special symbols should create value indirectly, not by direct paytable dominance

## RTP Balancing Strategy
### Recommended Prototype Target Bands
- `conservative prototype`: `90% to 93%`
- `standard engaging prototype`: `94% to 96%`
- `high-generosity showcase prototype`: `96% to 97%`

For internal fake-money playtesting, target:
- initial balancing band: `94.5% to 96.0%`

### RTP Allocation Recommendation
- Base line wins: `45% to 55%`
- Cascades and multiplier ladder: `12% to 18%`
- Special symbols: `8% to 12%`
- Bonus mode: `22% to 30%`

This prevents bonus mode from absorbing almost all perceived value while still keeping it exciting.

## Volatility Tuning Approach
Volatility should be configurable through:
- high-symbol weight density
- special symbol frequency
- multiplier frequency and caps
- bonus trigger rate
- average bonus payout

### Low Volatility Profile
- more common symbols
- lower high-symbol payout density
- lower multiplier caps
- more frequent but cheaper bonuses

### Medium Volatility Profile
- balanced common/high weights
- occasional multipliers
- bonus trigger frequency around the mid band
- bonus carries real upside but not dominant spike control

### High Volatility Profile
- lower hit rate
- heavier high-symbol and special-symbol dependence
- higher bonus EV concentration
- more rare large multiplier contributions

### Phase 1 Recommendation
Ship with `medium volatility`.
Reason:
- better readability for testing
- more frequent feedback loops
- easier math debugging
- better UX for a fake-money prototype

## Bonus Probability Structure
## Trigger Model
Bonus can trigger by:
- `3+ Samsara symbols on round outcome`
- `full Samsara meter`

### Recommended Balancing Principle
Do not let both trigger paths independently overfeed the system. Use:
- meter as primary long-term trigger path
- 3+ Samsara as rare direct trigger path

### Suggested Trigger Bands
- overall bonus trigger rate:
  - target `~1 in 110` to `1 in 180` base spins for medium volatility
- direct 3+ Samsara trigger:
  - rare sub-band
- meter trigger:
  - majority of bonus entries

This gives visible progress without making bonuses feel arbitrary.

## Bonus Mode Value Structure
### Sky Opens
- baseline: `8 free spins`
- retrigger allowed
- higher Seraphim Eye probability
- persistent multiplier support
- escalating excitement layer

### Current v1.2 Runtime Tuning
- profile version: `eye-sky-math-v1.2`
- bonus meter target: `30`
- paytable supports paying clusters from `4+`
- all paying combinations now return visible currency value even at the minimum bet
- special-symbol conversion pressure was reduced to stop runaway chain loops
- cascade depth is capped at `12` for stable pacing and professional readability

### Bonus EV Composition
Bonus EV should mainly come from:
- more event frequency
- longer cascade chains
- sticky / additive multiplier persistence

It should not depend solely on extremely rare jackpot-like outliers.

### Scatter / Special Rules Presentation Benchmark
The user-provided benchmark also shows a good presentation rule for scatter-type symbols:
- explain the scatter separately from the normal symbol grid
- state explicitly that it can appear on all reels / positions
- state explicitly that it pays anywhere

That should remain the target style for the future `Eye in the Sky` paytable/help screen.

### Retrigger Control
Retriggers should be allowed but capped by probability pressure, not by arbitrary hard-stop if possible.
Recommended:
- keep retrigger frequency low
- keep additional spin count flat or modest

## Special Mechanic Design
### Seraphim Eye
Purpose:
- inject base-game excitement
- improve board conversion potential

Math model:
- rare appearance
- transforms `2 to 4` random eligible symbols into wilds
- small probability of local multiplier

Tuning levers:
- appearance weight
- transform count distribution
- local multiplier chance
- multiplier size distribution

### Samsara
Purpose:
- visible progression system
- non-paying long-form anticipation

Math model:
- no direct payout
- contributes to bonus meter
- rare direct bonus trigger cluster

Tuning levers:
- appearance rate
- meter contribution per symbol
- direct trigger threshold

### Ouroboros
Purpose:
- persistent round identity
- stronger cascade continuation

Math model:
- persistent multiplier or board empowerment effect
- active only within current round / bonus round state

Tuning levers:
- frequency
- persistence rules
- affected area scope
- multiplier lift

### Panepoptis Ophthalmos
Purpose:
- ultra-rare global event
- memorable rounds

Math model:
- board rewrite, global multiplier, or temporary blessing/curse
- must stay rare enough to avoid dominating RTP

Tuning levers:
- occurrence rate
- effect family probability
- cap on total incremental value

## Spin Resolution Pipeline
1. load config version
2. resolve deterministic RNG seed
3. create initial board
4. snapshot `bonusStateBefore`
5. apply pre-win special symbol logic
6. evaluate winning clusters
7. compute payout for cluster set
8. compute cascade ladder increment
9. remove winners
10. collapse board
11. refill from weighted distribution
12. re-evaluate until terminal board state
13. update Samsara meter
14. resolve bonus trigger / retrigger
15. snapshot `bonusStateAfter`
16. compute wallet delta
17. emit audit-friendly round summary

## Simulation Architecture
### Core Requirements
- deterministic seeded runs
- profile versioning
- large sample support
- serializable result reports

### Simulation Modes
- `smoke`
  - 10k spins
- `balance-pass`
  - 100k spins
- `candidate-signoff`
  - 500k spins
- `stability-check`
  - 1M spins

### Required Output
- total spins
- RTP achieved
- average win
- hit frequency
- bonus trigger rate
- average bonus payout
- max observed win
- symbol appearance frequency
- cascade depth distribution
- multiplier contribution distribution

### Recommended Additional Output
- median win on hit
- 90th / 99th percentile round payout
- base RTP vs bonus RTP decomposition
- EV per special symbol family
- confidence interval for RTP

## Math Report Shape
Recommended `math-report.ts` output object:

```ts
type MathReport = {
  configVersion: string;
  spins: number;
  wagered: number;
  returned: number;
  achievedRtp: number;
  confidence95: { low: number; high: number };
  hitRate: number;
  bonusTriggerRate: number;
  averageWinOnHit: number;
  averageBonusPayout: number;
  maxObservedWin: number;
  cascadeDepthDistribution: Record<number, number>;
  multiplierDistribution: Record<string, number>;
  symbolFrequency: Record<string, number>;
  rtpBreakdown: {
    base: number;
    cascades: number;
    specials: number;
    bonus: number;
  };
};
```

## Game Pacing Design
### Desired Rhythm
- base spins should feel quick and readable
- winning spins should briefly expand into spectacle
- cascades should feel like an escalating chain, not a delay
- bonus should feel earned through buildup

### Pacing Targets
- non-winning base round:
  - fast settle
- small win:
  - short highlight, short cascade
- big win:
  - counter and board glow, slightly extended end beat
- bonus trigger:
  - strongest transition in the game

## Player Feedback Loop
### Base Loop
1. choose bet
2. spin
3. see immediate board readability
4. observe win/no-win outcome
5. if win, follow cascade chain
6. watch meter progress
7. anticipate bonus
8. return to spin

### Feedback Sources
- symbol highlights
- floating win values
- multiplier flashes
- meter animation
- round summary clarity
- history readability

The goal is repeatable satisfaction from clarity and pacing, not compulsion engineering.

## UI Feedback Improvements
### High Priority
- clear header with balance/win/mode/autospin/meter
- dominant spin CTA
- cascade staging
- better recent-round text formatting
- meaningful bonus transition

### Board-Level Improvements
- drop-in spawn motion
- winner pulse
- dissolve removal
- cascade refill animation
- multiplier flash layer
- bonus overlay treatment

### Audio Priorities
- spin press cue
- symbol drop cue
- win chime
- cascade fall cue
- multiplier flash cue
- bonus swell

## Data Structures For Round History
Recommended round history payload:

```ts
type RoundHistoryItem = {
  roundId: string;
  timestamp: string;
  bet: number;
  totalWin: number;
  walletDelta: number;
  mode: "base" | "bonus";
  cascades: number;
  appliedWinMultiplier: number;
  bonusTriggered: boolean;
  summaryLabel: string;
};
```

Recommended UI summaries:
- `WIN 120 | x3 | 2 cascades`
- `LOSS`
- `WIN 40 | x2`

## Future Server-Side Validation Strategy
### Principle
The final authoritative path must run on the server.

### Validation Plan
- client sends bet and session/context only
- server selects or derives seed
- server resolves outcome from config version
- server stores round record and wallet delta atomically
- server returns renderable result payload

### Integrity Checks
- config version stored with round
- seed stored with round
- wallet delta stored with round
- bonus state before/after stored
- dev/debug metadata stripped from production response if needed

### Test Strategy
- unit tests for symbol frequency helpers
- unit tests for cluster detection
- seeded determinism tests for `resolveSpin`
- regression suite for known profile outputs
- simulation smoke tests in CI

## Short-Term Implementation Priorities
1. expand `SpinResult` to full audit/debug shape
2. add config versioning
3. add simulation and math-report richness
4. establish target RTP and volatility profile
5. add seeded regression tests

## Change Log
- `2026-03-15`
  - Created initial math notes
  - Recorded required reporting scope and current tuning gaps
  - Updated gaps after adding placeholder `math-report.ts`
- `2026-03-16`
  - Replaced initial notes with full gameplay systems, math, probability, pacing, and simulation design blueprint
  - Completed documented reporting shape in engine-facing terms: config versioning, audit-friendly SpinResult contract, simulation distributions, and seeded regression foundation
  - Added math-audit note: current `eye-sky-math-v1` runtime config is far from the intended `94.5% to 96.0%` target and requires a dedicated tuning pass, not cosmetic UI adjustment
