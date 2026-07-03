# PAR Report — Constellation Simple v0.1

> Generated, do not edit by hand. Regenerate with:
> `corepack pnpm --filter @eye/game-engine par-report -- --spins 200000 --seed 1337 --profile constellation_simple_v0_1`

| | |
|---|---|
| Profile | `constellation_simple_v0_1` |
| Config version | `eye-sky-constellation-v0.1` |
| Legacy | no |
| Simulation batch | 200,000 spins @ 1.00 bet |
| Base seed | 1337 (deterministic, reproducible) |

## Design contract

| | |
|---|---|
| Target RTP | 95.2000% |
| Volatility class | high |
| Grid | 6x5 (30 cells) |
| Evaluation | count_anywhere (threshold 8) |
| Max cascade steps | 12 |
| Cascade multiplier ladder | 1 |
| Bonus trigger | scatter |
| Free spins awarded | 7 |

### Symbol distribution

| symbol | weight | probability |
|---|---|---|
| ashen_sigil | 16 | 18.3276% |
| broken_halo | 15.1 | 17.2967% |
| ritual_dagger | 14.1 | 16.1512% |
| sealed_scroll | 13.5 | 15.4639% |
| seraphim_feather | 9.7 | 11.1111% |
| burning_crown | 7.3 | 8.3620% |
| ophidian_relic | 5.3 | 6.0710% |
| celestial_gate | 3.8 | 4.3528% |
| seraphim_eye | 0.9 | 1.0309% |
| samsara | 1.6 | 1.8328% |

### Paytable (payout × bet by cluster/count size)

| symbol | 8+ | 10+ | 12+ |
|---|---|---|---|
| ashen_sigil | 0.2643x | 0.659x | 1.5723x |
| broken_halo | 0.3145x | 0.7861x | 1.8264x |
| ritual_dagger | 0.3947x | 0.94x | 2.2211x |
| sealed_scroll | 0.465x | 1.1005x | 2.609x |
| seraphim_feather | 0.7259x | 1.8264x | 4.7132x |
| burning_crown | 1.1005x | 2.7463x | 6.8107x |
| ophidian_relic | 1.6925x | 4.1812x | 10.4496x |
| celestial_gate | 2.482x | 6.2684x | 15.6711x |

## Simulated metrics

| metric | value |
|---|---|
| RTP achieved | **95.7348%** |
| RTP CI95 | 94.3385% – 97.1311% |
| Base game contribution | 91.8160% |
| Bonus contribution | 3.9189% |
| Hit rate | 46.2855% |
| Average win (all spins) | 0.92 |
| Average win (on hit) | 1.98 |
| Bonus trigger rate | 0.6003% (1 in 166.6 base spins) |
| Average bonus payout | 6.53 |
| Max observed win | 391.76x bet |
| Total wagered | 191404.00 |
| Total returned | 183240.30 |

### Win percentiles (per spin)

| percentile | win |
|---|---|
| p50 | 0.00 |
| p90 | 2.42 |
| p95 | 3.89 |
| p99 | 9.93 |

### Cascade depth distribution

| depth | spins | share |
|---|---|---|
| 0 | 107429 | 53.7145% |
| 1 | 44235 | 22.1175% |
| 2 | 22985 | 11.4925% |
| 3 | 13541 | 6.7705% |
| 4 | 6927 | 3.4635% |
| 5 | 2850 | 1.4250% |
| 6 | 1188 | 0.5940% |
| 7 | 511 | 0.2555% |
| 8 | 199 | 0.0995% |
| 9 | 85 | 0.0425% |
| 10 | 32 | 0.0160% |
| 11 | 9 | 0.0045% |
| 12 | 9 | 0.0045% |
