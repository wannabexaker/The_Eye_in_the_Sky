# Game Economy

## Scope
This document covers the fake-money economy only.

## Fake-Money Economy Rules
- The player starts with a configurable fake balance.
- Bets reduce fake balance.
- Wins increase fake balance.
- Bonus spins do not deduct a new base bet.
- Reset balance is available in MVP.
- All balance changes should conceptually flow through a ledger abstraction.

## Wallet Concepts
- `wallet`
  - current fake balance
- `ledger entry`
  - immutable record of delta
  - reason: bet, win, reset, bonus adjustment
- `round summary`
  - references round id, bet, result, ending balance

## MVP Economy Constraints
- No deposits
- No withdrawals
- No real-money denomination handling
- No cashout UX
- No bonuses/promotions system beyond the actual game bonus mode

## Future-Ready Design
Even in fake-money mode:
- keep transaction reason codes
- keep round-linked wallet deltas
- keep reset events auditable

## Open Questions
- whether reset balance should be capped per session in internal QA mode
- whether dev builds should expose bankroll presets

## Change Log
- `2026-03-15`
  - Created initial fake-money economy notes
