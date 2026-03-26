# Simple Variant Design

## Status
- Phase: `implemented / tuned / first-pass signoff`
- Scope: `sub-variant inside The Eye in the Sky`
- Purpose: `define a simpler, faster, count-anywhere variant that reuses the main game shell`
- Last updated: `2026-03-26`

## Role Inside The Product
`The Eye in the Sky` remains the main slot game and the premium flagship experience.

This document defines a lighter variant that should feel like:
- another stage / layer / path inside the same game world
- the same product, not a separate brand
- simpler and faster to read than the main game
- more immediately rewarding in pacing

This variant must not become a different visual system.

It should reuse the main game's:
- background
- board frame
- logo
- typography
- control layout
- overlays
- sound language
- general art direction

At most, it may introduce:
- one alternate special symbol behavior
- one small mode badge / label
- one adjusted paytable help view

## Recommended Working Name
Recommended variant name:
- `Constellation`

Recommended full label:
- `The Eye in the Sky: Constellation`

Why this is the strongest option:
- it stays inside the celestial identity
- it implies that symbols matter across the whole board, not only when touching
- it sounds like a stage / mode within the same game
- it avoids sounding like a different casino title

Backup names:
- `Open Sky`
- `First Heaven`
- `Wide Watch`

## Benchmark Model We Are Targeting
This variant should intentionally move closer to the benchmark family represented by the user-provided screenshot and the public `Gates of Olympus` style model.

The important benchmark behaviors are:
- `6x5` board
- wins pay by total matching-symbol count anywhere on screen
- no adjacency requirement
- `3` clean count bands for regular symbols
- tumbles / cascades remain active
- one simple global multiplier-style special is easier to read than many overlapping mechanics
- scatter is explained separately from the normal symbol table
- the paytable should be readable in one quick help screen on mobile

This is a benchmark for structure and UX clarity, not a direct copy target.

## How It Must Differ From Main Eye
### Main Eye
- cluster adjacency required
- wins start at `4+`
- many ladder steps: `4 / 5 / 6 / 7 / 8 / 10 / 12+`
- more system-heavy identity
- multiple special families active
- stricter, more technical, more professional feel

### Constellation Variant
- no adjacency requirement
- same-symbol count anywhere on the board
- regular wins should use only `3` count bands:
  - `8-9`
  - `10-11`
  - `12+`
- simpler mental model
- fewer active special behaviors
- faster read, faster feedback, less rules burden

## Critical Design Constraint: We Have 12 Symbols
The current `Eye` asset set includes:
- `8` regular paying symbols
- `4` specials

That is materially different from the benchmark slot family, so payouts and probabilities cannot be copied directly.

This creates two valid approaches:

### Recommended Approach
Keep the full art library available, but do **not** force all symbols to be mechanically active in the simple variant.

Recommended active gameplay roster for the simple variant:
- `8` regular paying symbols
- `1` scatter symbol
- `1` simple multiplier symbol

Optional:
- `1` alternate special symbol later, only if it does not damage readability

This keeps the rules clean.

### Not Recommended
Activating all `12` gameplay symbols in the simple variant from day one.

Why this is weaker:
- lower base hit clarity
- more dilution in symbol appearance
- harder paytable reading
- more balancing complexity
- less similarity to the benchmark's immediate readability

## Recommended Symbol Mapping
### Regular Paying Symbols
Use the current `8` regular Eye symbols as the paying set:
- Ashen Sigil
- Broken Halo
- Ritual Dagger
- Sealed Scroll
- Seraphim Feather
- Burning Crown
- Ophidian Relic
- Celestial Gate

### Scatter
Recommended scatter for the simple variant:
- `Samsara`

Reason:
- it already reads as a special icon
- it already maps naturally to bonus entry in the main game
- it gives continuity across Eye variants

### Multiplier Special
Recommended simple multiplier special:
- `Seraphim Eye`

Recommended role in the simple variant:
- appears as a global win multiplier symbol
- applies additively across the current tumble sequence
- should be easy to read in one line of help text

### Symbols To Disable In The First Simple Pass
Recommended to remove from active gameplay initially:
- `Ouroboros`
- `Panepoptis Ophthalmos`

Reason:
- both are useful in the main game
- both add cognitive overhead in a simplified variant
- both can return later in an advanced variant if needed

## Recommended Ruleset For The First Simple Pass
### Board
- keep `6x5`
- keep the same board art and layout

### Win Detection
- matching regular symbols pay anywhere on the board
- count the total number of matching symbols visible after each settle
- regular wins start at `8`

### Regular Pay Bands
Use only:
- `8-9`
- `10-11`
- `12+`

This is the single most important simplification.

### Cascades
- keep tumbles / cascades
- remove winning symbols
- refill
- continue until no new win exists

### Multiplier Logic
Recommended first-pass rule:
- `Seraphim Eye` acts as the only multiplier special
- if one or more appear during a winning settle, their values add together
- the total multiplier applies to the win for that settle / tumble chain

This should be simpler than the current multi-special modifier stack.

### Bonus Logic
Recommended first-pass rule:
- `Samsara` acts as scatter
- scatter pays separately from regular symbols
- `4+` scatters trigger free spins
- retrigger logic can remain simple and flat

Recommended first-pass bonus rule:
- do not use the main game's meter as a primary mechanic in this variant

Reason:
- the benchmark-style simple variant should be immediately understandable
- scatter-only trigger logic is easier to explain than meter + event-state hybrid logic

## Paytable Direction
Because the simple variant keeps `8` regular paying symbols, not the benchmark's exact symbol set, we should copy the **shape**, not the exact numbers.

What should be preserved:
- clear high / mid / low value hierarchy
- stronger separation between top symbols and low symbols than current main Eye has
- very easy scan order on mobile
- scatter shown in a completely separate block

What should change relative to current main Eye:
- fewer payout thresholds
- larger gaps between value tiers
- more dramatic top-symbol identity

Main Eye currently has a relatively compressed value spread.

The simple variant should widen that spread.

Practical target:
- low symbols should feel like frequent fillers
- mid symbols should feel meaningfully better
- top symbols should feel obviously premium
- top-band values should separate much harder from the lowest tier than they do in current `Eye`

## UX Direction
The user wants this mode to feel more magnetic than the main game's stricter professional tone.

The safe and product-sound way to interpret that is:
- quicker feedback
- simpler reading
- less friction
- more visible small wins
- fewer rule explanations
- stronger sense of forward flow

Do **not** use manipulative or deceptive design.

Keep the PRD rules intact:
- no deceptive steering
- no fake near misses
- no dark-pattern reinforcement systems

### Best UX For This Variant
- keep the same shell and art as the main game
- add one clear mode label near the board or in the info modal:
  - `Constellation`
- rewrite the help copy so the first line says:
  - symbols pay anywhere on the board
  - only the total count matters
- replace cluster-path style explanation with full-board count explanation
- in win presentation, highlight all matching symbols together instead of drawing adjacency paths
- keep the paytable shorter and more visual than the main game's advanced rules
- keep overlay copy lighter and faster to scan
- reduce technical wording in this mode

### Board Feedback Differences
- main Eye can emphasize cluster paths and connected wins
- Constellation should emphasize:
  - full-board symbol count
  - total matched symbols
  - tumble continuation
  - multiplier total

That means:
- less path-line emphasis
- more whole-screen match emphasis
- stronger grouped flash for matching symbols of the same type

### Modal / Info UX
Recommended order in the info/help modal for this variant:
1. `How Wins Work`
2. `Regular Symbol Paytable`
3. `Scatter`
4. `Multiplier Symbol`
5. `Free Spins`

Do not bury the core rule below long flavor text.

The first visible explanation should immediately tell the player:
- matching symbols pay anywhere
- `8+` regular symbols are needed
- scatters pay separately

## Reuse Rules
The simple variant should reuse:
- same app shell
- same rails
- same footer controls
- same responsive layout
- same logo
- same board frame
- same symbol art unless one special symbol is intentionally replaced

Do not build:
- a separate brand package
- a separate CSS identity
- separate control logic layout
- separate modal language system

This is a variant layer, not another casino game.

## Engineering Guidance
When implementation starts, prefer this path:

1. keep the current main game untouched
2. add a new variant config instead of mutating the main config
3. isolate rules behind a variant-aware resolver path
4. reuse the same UI shell and asset manifest
5. change only:
   - win-evaluation logic
   - paytable content
   - active special behavior mapping
   - rules/help copy
   - board win-highlighting behavior

Do not fork the whole player app just to create this variant.

## Recommendation Summary
If the goal is a simpler and more immediately satisfying Eye variant, the best version is:
- same `Eye` product shell
- same visual identity
- recommended name: `Constellation`
- `8` regular paying symbols
- `Samsara` as scatter
- `Seraphim Eye` as the only multiplier special
- `Ouroboros` and `Panepoptis` disabled in the first pass
- wins by total count anywhere on the board
- `8-9 / 10-11 / 12+` pay bands
- separate scatter block
- simpler copy
- faster and cleaner board feedback

## Open Questions
- whether the simple variant should keep any meter at all
- whether scatter should pay on `4 / 5 / 6` or only trigger bonus
- whether the multiplier symbol should appear in both base and bonus at the same strength
- whether the simple variant should support one optional alternate special symbol after the first pass

## First-Pass Math Contract
This section locks the first professional balancing target for implementation.

These numbers are a **design contract**, not yet a certified math result.

Actual RTP must be validated by simulation after implementation.

### Target Envelope
- target RTP: `95.00%` to `95.40%`
- target volatility: `medium-high`
- target hit frequency: lower than the current main Eye game, but with clearer perceived spikes
- target max exposure: `x1000`
- design rule: the variant may allow dramatic wins, but it must remain distribution-driven and must never depend on player loss history

### RTP Allocation Direction
Recommended first-pass allocation:
- base regular symbol wins: `52%` to `58%`
- multiplier-symbol contribution: `18%` to `24%`
- free spins feature contribution: `18%` to `24%`
- extreme multiplier layer (`150x+`): `1.5%` to `3.0%`

Interpretation:
- most RTP should still come from normal board outcomes
- multipliers should be exciting, not the only source of value
- top-end spikes must exist, but occupy a tightly controlled share of total EV

## First-Pass Multiplier Model
### Multiplier Symbol Role
`Seraphim Eye` is the only active multiplier special in the first simple pass.

Recommended behavior:
- it lands as a dedicated multiplier symbol
- if the settle produces any regular-symbol or scatter win, all visible multiplier symbols are collected
- their values add together
- the total is applied once to the settle win
- the multiplier resets before the next tumble unless explicitly changed later by design

This keeps the rule readable:
- `win first`
- `add all Eye multipliers`
- `apply total once`

### Recommended Multiplier Ladder
Use this discrete ladder:
- `2x`
- `3x`
- `4x`
- `5x`
- `6x`
- `7x`
- `8x`
- `10x`
- `12x`
- `15x`
- `20x`
- `25x`
- `30x`
- `40x`
- `50x`
- `75x`
- `100x`
- `150x`
- `200x`
- `300x`
- `500x`
- `1000x`

This is intentionally discrete.

Do not use every intermediate value.

The sparse ladder is easier to balance, easier to communicate, and safer for RTP control.

### Recommended Relative Weights
Use these as first-pass normalized weights:
- `2x`: `24000`
- `3x`: `19000`
- `4x`: `15000`
- `5x`: `11000`
- `6x`: `7500`
- `7x`: `5500`
- `8x`: `4200`
- `10x`: `3300`
- `12x`: `2600`
- `15x`: `2000`
- `20x`: `1550`
- `25x`: `1150`
- `30x`: `850`
- `40x`: `550`
- `50x`: `350`
- `75x`: `180`
- `100x`: `100`
- `150x`: `55`
- `200x`: `28`
- `300x`: `12`
- `500x`: `4`
- `1000x`: `1`

Interpretation:
- most multiplier appearances should cluster in the `2x` to `10x` region
- `25x+` should feel rare
- `100x+` should feel exceptional
- `500x` and `1000x` must exist mainly as ultra-rare event layers, not as routine bonus outcomes

### Safety Guardrails
To prevent RTP runaway:
- `1000x` should be allowed only in bonus mode
- `500x` and `1000x` should not be allowed to combine with another `100x+` multiplier in the same settle
- base-game multiplier values should normally stop at `50x`, with `75x` and `100x` allowed only at very low frequency if later simulation proves safe
- a multiplier should only matter on a settle that already has a winning outcome
- dead boards must not receive value from standalone multiplier landings

## First-Pass Regular Symbol Paytable
The simple variant should keep only `3` regular-symbol count bands:
- `8-9`
- `10-11`
- `12+`

Implementation note:
- for engine simplicity, store them as thresholds `8`, `10`, and `12`
- any count above the threshold pays the same band

### Recommended Value Hierarchy
The spread should be visibly wider than the main game.

Recommended first-pass total-bet multipliers:

| Symbol | 8+ | 10+ | 12+ |
| --- | ---: | ---: | ---: |
| Ashen Sigil | `0.10` | `0.25` | `0.60` |
| Broken Halo | `0.12` | `0.30` | `0.70` |
| Ritual Dagger | `0.15` | `0.36` | `0.85` |
| Sealed Scroll | `0.18` | `0.42` | `1.00` |
| Seraphim Feather | `0.28` | `0.70` | `1.80` |
| Burning Crown | `0.42` | `1.05` | `2.60` |
| Ophidian Relic | `0.65` | `1.60` | `4.00` |
| Celestial Gate | `0.95` | `2.40` | `6.00` |

These are intentionally conservative in the base layer.

The variant's emotional power should come from:
- whole-board count wins
- tumbles
- multiplier overlays
- bonus spikes

not from oversized unmultiplied base payouts.

## First-Pass Scatter / Bonus Contract
### Scatter
`Samsara` is the scatter.

Recommended first-pass scatter behavior:
- `4` scatters: trigger bonus
- `5` scatters: trigger bonus with upgraded start package
- `6` scatters: trigger bonus with premium start package

Recommended first-pass scatter pays:
- `4`: `1.0x`
- `5`: `4.0x`
- `6`: `20.0x`

Scatter pays should be separate from the regular-symbol table.

### Free Spins Start Package
Recommended first-pass free-spin awards:
- `4` scatters -> `7` free spins
- `5` scatters -> `10` free spins
- `6` scatters -> `15` free spins

Recommended bonus tuning rules:
- bonus should contain a materially higher chance of multiplier symbols
- `150x+` values should be primarily bonus-facing
- retriggers, if allowed in first pass, should stay flat and simple

### Meter Rule
Recommended first-pass decision:
- do **not** use the current main-game meter in the simple variant
- hide it entirely or repurpose it later only if a future version truly needs it

Reason:
- the simple variant must feel instantly readable
- a scatter-only trigger is more compatible with the intended benchmark structure

## High-Win Philosophy
The simple variant should absolutely allow dramatic screenshots and emotionally large moments.

But it must do so cleanly:
- a player may receive a very large multiplier over a very small base win
- this can still produce a satisfying but RTP-safe payout
- example logic:
  - small symbol win worth `0.01`
  - multiplier stack reaches `1000x`
  - final payout = `10.00`

This is valid and desirable **as long as** it comes from fixed weights and simulation-verified math.

Do not introduce:
- player-history steering
- loss-recovery logic
- dynamic compensation logic
- hidden balancing based on recent session losses

All balancing must come from static probabilities and transparent engine rules.

## Implementation Isolation Contract
When engineering starts:
- current `legacy_v1_3` and `math_base_v2_0` must remain untouched in behavior
- add a new isolated config/profile for the simple variant
- gate it behind a variant-aware resolver path
- keep the same shell, same art family, and same frontend layout ownership
- only change variant-aware:
  - evaluation logic
  - active specials
  - paytable/help copy
  - symbol highlighting behavior
  - bonus trigger behavior

This protects the live main game from accidental regressions while the simple variant is being built.

## Current Implementation Checkpoint
- profile id: `constellation_simple_v0_1`
- implementation status: engine-isolated and player-shell-aware
- current locked evaluation mode: `count-anywhere`
- current locked bonus trigger: `Samsara` scatter (`4 / 5 / 6`)
- current locked multiplier special: `Seraphim Eye`

### Verified First-Pass Signoff
Verified with:
- `corepack pnpm --filter @eye/game-engine test`
- `corepack pnpm --filter @eye/game-engine simulate --profile constellation_simple_v0_1 --spins 1000000 --bet 1 --seed 1337`

Current verified result:
- RTP: `95.2358%`
- confidence interval: `94.6464% - 95.8252%`
- hit rate: `46.3143%`
- bonus trigger rate: `0.5908%`
- average bonus payout: `6.76`
- max observed win in signoff sample: `391.76x bet`

### Current UI Copy Contract
The shared player shell remains the same, but the variant now requires different wording in active presentation surfaces:
- menu/help/paytable copy must say `count-anywhere` and `scatter`, not cluster/meter
- left rail must show `Samsara Scatter` rules instead of the live meter
- bonus-entry overlay must describe a scatter-triggered `Constellation` bonus flow
- bonus-complete overlay must read as `Constellation` completion, not generic main-game meter flow
- round-win presentation should prefer `BOARD WIN` / `TUMBLE TOTAL` wording over connected-cluster language
