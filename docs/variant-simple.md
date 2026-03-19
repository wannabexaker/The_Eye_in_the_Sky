# Simple Variant Design

## Status
- Phase: `research / design only`
- Scope: `sub-variant inside The Eye in the Sky`
- Purpose: `define a simpler, faster, count-anywhere variant that reuses the main game shell`
- Last updated: `2026-03-19`

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
