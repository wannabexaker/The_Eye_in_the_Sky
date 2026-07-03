# PAR Report — Math Base v2.0

> Generated, do not edit by hand. Regenerate with:
> `corepack pnpm --filter @eye/game-engine par-report -- --spins 200000 --seed 1337 --profile math_base_v2_0`

| | |
|---|---|
| Profile | `math_base_v2_0` |
| Config version | `eye-sky-math-v2.0` |
| Legacy | no |
| Simulation batch | 200,000 spins @ 1.00 bet |
| Base seed | 1337 (deterministic, reproducible) |

## Design contract

| | |
|---|---|
| Target RTP | 95.4000% |
| Volatility class | medium |
| Grid | 6x5 (30 cells) |
| Evaluation | cluster (threshold 4) |
| Max cascade steps | 12 |
| Cascade multiplier ladder | 1 / 1.2 / 1.45 / 1.9 / 2.35 |
| Bonus trigger | meter (target 17) |
| Free spins awarded | 7 |

### Symbol distribution

| symbol | weight | probability |
|---|---|---|
| ashen_sigil | 14.8 | 18.9295% |
| broken_halo | 14.1 | 18.0341% |
| ritual_dagger | 13.3 | 17.0109% |
| sealed_scroll | 13.3 | 17.0109% |
| seraphim_feather | 8 | 10.2321% |
| burning_crown | 6.2 | 7.9299% |
| ophidian_relic | 4.55 | 5.8195% |
| celestial_gate | 3.3 | 4.2208% |
| seraphim_eye | 0.33 | 0.4221% |
| samsara | 0.075 | 0.0959% |
| ouroboros | 0.155 | 0.1982% |
| panepoptis_ophthalmos | 0.075 | 0.0959% |

### Paytable (payout × bet by cluster/count size)

| symbol | 4+ | 5+ | 6+ | 7+ | 8+ | 10+ | 12+ |
|---|---|---|---|---|---|---|---|
| ashen_sigil | 0.3805x | 0.462x | 0.7397x | 1.1103x | 1.6655x | 2.999x | 5.0745x |
| broken_halo | 0.4566x | 0.5548x | 0.8322x | 1.2952x | 1.8523x | 3.4675x | 5.7674x |
| ritual_dagger | 0.5327x | 0.6476x | 1.0171x | 1.4828x | 2.2228x | 4.0685x | 6.6902x |
| sealed_scroll | 0.6088x | 0.7401x | 1.1096x | 1.6668x | 2.5933x | 4.6233x | 7.6177x |
| seraphim_feather | 0.8372x | 1.0171x | 1.5719x | 2.3117x | 3.4213x | 6.2415x | 9.6795x |
| burning_crown | 1.2176x | 1.4828x | 2.2193x | 3.3288x | 4.8179x | 8.7843x | 13.6362x |
| ophidian_relic | 1.7503x | 2.1316x | 3.2271x | 4.6225x | 6.7654x | 12.252x | 18.9526x |
| celestial_gate | 2.3591x | 2.873x | 4.3338x | 6.1949x | 9.0828x | 16.4127x | 25.4282x |

## Simulated metrics

| metric | value |
|---|---|
| RTP achieved | **93.9509%** |
| RTP CI95 | 91.8359% – 96.0660% |
| Base game contribution | 82.8683% |
| Bonus contribution | 11.0826% |
| Hit rate | 49.0295% |
| Average win (all spins) | 0.92 |
| Average win (on hit) | 1.87 |
| Bonus trigger rate | 0.3195% (1 in 313.0 base spins) |
| Average bonus payout | 34.69 |
| Max observed win | 462.83x bet |
| Total wagered | 195625.00 |
| Total returned | 183791.50 |

### Win percentiles (per spin)

| percentile | win |
|---|---|
| p50 | 0.00 |
| p90 | 1.89 |
| p95 | 3.04 |
| p99 | 12.09 |

### Cascade depth distribution

| depth | spins | share |
|---|---|---|
| 0 | 101941 | 50.9705% |
| 1 | 64755 | 32.3775% |
| 2 | 20804 | 10.4020% |
| 3 | 6759 | 3.3795% |
| 4 | 2453 | 1.2265% |
| 5 | 1049 | 0.5245% |
| 6 | 594 | 0.2970% |
| 7 | 369 | 0.1845% |
| 8 | 240 | 0.1200% |
| 9 | 192 | 0.0960% |
| 10 | 173 | 0.0865% |
| 11 | 121 | 0.0605% |
| 12 | 550 | 0.2750% |
