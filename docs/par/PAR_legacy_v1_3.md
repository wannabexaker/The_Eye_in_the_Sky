# PAR Report — Legacy Math v1.3

> Generated, do not edit by hand. Regenerate with:
> `corepack pnpm --filter @eye/game-engine par-report -- --spins 200000 --seed 1337 --profile legacy_v1_3`

| | |
|---|---|
| Profile | `legacy_v1_3` |
| Config version | `eye-sky-math-v1.3` |
| Legacy | yes (reference only) |
| Simulation batch | 200,000 spins @ 1.00 bet |
| Base seed | 1337 (deterministic, reproducible) |

## Design contract

| | |
|---|---|
| Target RTP | 95.5000% |
| Volatility class | medium |
| Grid | 6x5 (30 cells) |
| Evaluation | cluster (threshold 4) |
| Max cascade steps | 12 |
| Cascade multiplier ladder | 1 / 1.25 / 1.5 / 2 / 2.5 |
| Bonus trigger | meter (target 17) |
| Free spins awarded | 7 |

### Symbol distribution

| symbol | weight | probability |
|---|---|---|
| ashen_sigil | 14.5 | 18.6232% |
| broken_halo | 13.8 | 17.7241% |
| ritual_dagger | 13.1 | 16.8251% |
| sealed_scroll | 13.1 | 16.8251% |
| seraphim_feather | 8.2 | 10.5317% |
| burning_crown | 6.4 | 8.2199% |
| ophidian_relic | 4.7 | 6.0365% |
| celestial_gate | 3.4 | 4.3668% |
| seraphim_eye | 0.34 | 0.4367% |
| samsara | 0.08 | 0.1027% |
| ouroboros | 0.16 | 0.2055% |
| panepoptis_ophthalmos | 0.08 | 0.1027% |

### Paytable (payout × bet by cluster/count size)

| symbol | 4+ | 5+ | 6+ | 7+ | 8+ | 10+ | 12+ |
|---|---|---|---|---|---|---|---|
| ashen_sigil | 0.3829x | 0.467x | 0.7472x | 1.1208x | 1.6812x | 3.0355x | 5.137x |
| broken_halo | 0.4595x | 0.5604x | 0.8406x | 1.3076x | 1.868x | 3.5025x | 5.8375x |
| ritual_dagger | 0.5361x | 0.6538x | 1.0274x | 1.4944x | 2.2416x | 4.1096x | 6.7715x |
| sealed_scroll | 0.6127x | 0.7472x | 1.1208x | 1.6812x | 2.6152x | 4.67x | 7.7055x |
| seraphim_feather | 0.8425x | 1.0274x | 1.5878x | 2.335x | 3.4558x | 6.3045x | 9.807x |
| burning_crown | 1.2254x | 1.4944x | 2.2416x | 3.3624x | 4.8568x | 8.873x | 13.7765x |
| ophidian_relic | 1.7615x | 2.1482x | 3.269x | 4.67x | 6.8182x | 12.3755x | 19.147x |
| celestial_gate | 2.3742x | 2.8954x | 4.3898x | 6.2578x | 9.1532x | 16.5785x | 25.685x |

## Simulated metrics

| metric | value |
|---|---|
| RTP achieved | **95.6363%** |
| RTP CI95 | 92.8214% – 98.4511% |
| Base game contribution | 82.2338% |
| Bonus contribution | 13.4025% |
| Hit rate | 47.8210% |
| Average win (all spins) | 0.93 |
| Average win (on hit) | 1.95 |
| Bonus trigger rate | 0.3362% (1 in 297.4 base spins) |
| Average bonus payout | 39.86 |
| Max observed win | 914.59x bet |
| Total wagered | 195401.00 |
| Total returned | 186874.24 |

### Win percentiles (per spin)

| percentile | win |
|---|---|
| p50 | 0.00 |
| p90 | 1.83 |
| p95 | 3.01 |
| p99 | 12.82 |

### Cascade depth distribution

| depth | spins | share |
|---|---|---|
| 0 | 104358 | 52.1790% |
| 1 | 63733 | 31.8665% |
| 2 | 19742 | 9.8710% |
| 3 | 6391 | 3.1955% |
| 4 | 2392 | 1.1960% |
| 5 | 1065 | 0.5325% |
| 6 | 601 | 0.3005% |
| 7 | 394 | 0.1970% |
| 8 | 288 | 0.1440% |
| 9 | 189 | 0.0945% |
| 10 | 141 | 0.0705% |
| 11 | 119 | 0.0595% |
| 12 | 587 | 0.2935% |
