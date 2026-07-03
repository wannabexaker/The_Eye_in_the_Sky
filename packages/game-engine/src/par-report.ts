/*
Purpose: PAR-sheet style report generator for certification / due-diligence.
Layer: game-engine (deterministic, no I/O in the pure generator).

For each math profile it combines:
- the static design contract (symbol probabilities, paytable, bonus config)
- a seeded simulation batch (RTP, CI95, hit rate, volatility percentiles,
  cascade distribution, bonus cadence)

The output is fully reproducible: the profile id, spin count and base seed are
printed in the header, and identical inputs always produce an identical report
(the engine RNG is a pure LCG over the derived seed sequence).

CLI (writes docs/par/PAR_<profile>.md + .json for every profile):
  corepack pnpm --filter @eye/game-engine par-report -- --spins 1000000 --seed 1337
*/

import {
  getGameConfigProfile,
  listGameConfigProfiles,
  type GameMathProfileId
} from "./config";
import { simulateSpins } from "./simulation";
import type { GameConfig, SimulationResult } from "./types";

declare const process: {
  argv: string[];
  cwd: () => string;
};

export type ParReport = {
  generatedFor: {
    profileId: GameMathProfileId;
    label: string;
    configVersion: string;
    isLegacy: boolean;
  };
  reproducibility: {
    spins: number;
    bet: number;
    baseSeed: number;
    command: string;
  };
  design: {
    targetRtp: number;
    volatility: string;
    grid: string;
    evaluationMode: string;
    clusterThreshold: number;
    maxCascadeSteps: number;
    cascadeMultiplierLadder: number[];
    bonusTriggerMode: string;
    bonusMeterTarget: number;
    bonusSpinsAwarded: number;
    symbolProbabilities: Array<{ symbol: string; weight: number; probability: number }>;
    paytable: Array<{ symbol: string; payouts: Record<string, number> }>;
  };
  simulated: SimulationResult;
};

const round = (value: number, digits = 6) => Number(value.toFixed(digits));

export const buildParReport = (
  profileId: GameMathProfileId,
  spins: number,
  baseSeed: number,
  bet = 1
): ParReport => {
  const profile = getGameConfigProfile(profileId);
  const config: GameConfig = profile.config;

  const totalWeight = config.symbolWeights.reduce((sum, entry) => sum + entry.weight, 0);
  const symbolProbabilities = config.symbolWeights.map((entry) => ({
    symbol: entry.symbol,
    weight: entry.weight,
    probability: round(entry.weight / totalWeight)
  }));

  const simulated = simulateSpins({ spins, bet, baseSeed, winMultiplier: 1 }, config);

  return {
    generatedFor: {
      profileId: profile.id,
      label: profile.label,
      configVersion: config.version,
      isLegacy: profile.isLegacy
    },
    reproducibility: {
      spins,
      bet,
      baseSeed,
      command: `corepack pnpm --filter @eye/game-engine par-report -- --spins ${spins} --seed ${baseSeed} --profile ${profileId}`
    },
    design: {
      targetRtp: config.targetRtp,
      volatility: config.volatility,
      grid: `${config.cols}x${config.rows} (${config.totalCells} cells)`,
      evaluationMode: config.evaluationMode,
      clusterThreshold: config.clusterThreshold,
      maxCascadeSteps: config.maxCascadeSteps,
      cascadeMultiplierLadder: config.cascadeMultiplierLadder,
      bonusTriggerMode: config.bonusTriggerMode,
      bonusMeterTarget: config.bonusMeterTarget,
      bonusSpinsAwarded: config.bonusSpinsAwarded,
      symbolProbabilities,
      paytable: config.paytable.map((entry) => ({
        symbol: entry.symbol,
        payouts: Object.fromEntries(
          Object.entries(entry.payouts).map(([size, value]) => [size, value])
        )
      }))
    },
    simulated
  };
};

const pct = (value: number) => `${(value * 100).toFixed(4)}%`;
const money = (value: number) => value.toFixed(2);

export const renderParReportMarkdown = (report: ParReport): string => {
  const { generatedFor, reproducibility, design, simulated } = report;

  const symbolRows = design.symbolProbabilities
    .map(
      (entry) =>
        `| ${entry.symbol} | ${entry.weight} | ${(entry.probability * 100).toFixed(4)}% |`
    )
    .join("\n");

  const paytableSizes = Array.from(
    new Set(design.paytable.flatMap((entry) => Object.keys(entry.payouts)))
  ).sort((a, b) => Number(a) - Number(b));
  const paytableHeader = `| symbol | ${paytableSizes.map((size) => `${size}+`).join(" | ")} |`;
  const paytableDivider = `|---|${paytableSizes.map(() => "---").join("|")}|`;
  const paytableRows = design.paytable
    .map(
      (entry) =>
        `| ${entry.symbol} | ${paytableSizes
          .map((size) => (entry.payouts[size] !== undefined ? `${entry.payouts[size]}x` : "—"))
          .join(" | ")} |`
    )
    .join("\n");

  const cascadeRows = Object.entries(simulated.cascadeDepthDistribution)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([depth, count]) => {
      const share = simulated.totalSpins > 0 ? count / simulated.totalSpins : 0;
      return `| ${depth} | ${count} | ${pct(share)} |`;
    })
    .join("\n");

  const bonusCadence =
    simulated.bonusTriggerRate > 0 ? `1 in ${(1 / simulated.bonusTriggerRate).toFixed(1)}` : "—";

  return `# PAR Report — ${generatedFor.label}

> Generated, do not edit by hand. Regenerate with:
> \`${reproducibility.command}\`

| | |
|---|---|
| Profile | \`${generatedFor.profileId}\` |
| Config version | \`${generatedFor.configVersion}\` |
| Legacy | ${generatedFor.isLegacy ? "yes (reference only)" : "no"} |
| Simulation batch | ${reproducibility.spins.toLocaleString("en-US")} spins @ ${money(reproducibility.bet)} bet |
| Base seed | ${reproducibility.baseSeed} (deterministic, reproducible) |

## Design contract

| | |
|---|---|
| Target RTP | ${pct(design.targetRtp)} |
| Volatility class | ${design.volatility} |
| Grid | ${design.grid} |
| Evaluation | ${design.evaluationMode} (threshold ${design.clusterThreshold}) |
| Max cascade steps | ${design.maxCascadeSteps} |
| Cascade multiplier ladder | ${design.cascadeMultiplierLadder.join(" / ")} |
| Bonus trigger | ${design.bonusTriggerMode}${design.bonusTriggerMode === "meter" ? ` (target ${design.bonusMeterTarget})` : ""} |
| Free spins awarded | ${design.bonusSpinsAwarded} |

### Symbol distribution

| symbol | weight | probability |
|---|---|---|
${symbolRows}

### Paytable (payout × bet by cluster/count size)

${paytableHeader}
${paytableDivider}
${paytableRows}

## Simulated metrics

| metric | value |
|---|---|
| RTP achieved | **${pct(simulated.achievedRtp)}** |
| RTP CI95 | ${pct(simulated.confidenceInterval95.low)} – ${pct(simulated.confidenceInterval95.high)} |
| Base game contribution | ${pct(simulated.baseRtpContribution)} |
| Bonus contribution | ${pct(simulated.bonusRtpContribution)} |
| Hit rate | ${pct(simulated.hitRate)} |
| Average win (all spins) | ${money(simulated.averageWin)} |
| Average win (on hit) | ${money(simulated.averageWinOnHit)} |
| Bonus trigger rate | ${pct(simulated.bonusTriggerRate)} (${bonusCadence} base spins) |
| Average bonus payout | ${money(simulated.averageBonusPayout)} |
| Max observed win | ${money(simulated.maxObservedWin)}x bet |
| Total wagered | ${money(simulated.totalWagered)} |
| Total returned | ${money(simulated.totalReturned)} |

### Win percentiles (per spin)

| percentile | win |
|---|---|
| p50 | ${money(simulated.percentileWinDistribution.p50)} |
| p90 | ${money(simulated.percentileWinDistribution.p90)} |
| p95 | ${money(simulated.percentileWinDistribution.p95)} |
| p99 | ${money(simulated.percentileWinDistribution.p99)} |

### Cascade depth distribution

| depth | spins | share |
|---|---|---|
${cascadeRows}
`;
};

const parseNumberArg = (flag: string, fallback: number): number => {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return fallback;
  }
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) ? value : fallback;
};

export const runParReportCli = async () => {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { join } = await import("node:path");

  const spins = parseNumberArg("--spins", 200_000);
  const seed = parseNumberArg("--seed", 1337);
  const profileArgIndex = process.argv.indexOf("--profile");
  const onlyProfile =
    profileArgIndex === -1 ? null : (process.argv[profileArgIndex + 1] as GameMathProfileId);

  const outDir = join(process.cwd(), "..", "..", "docs", "par");
  await mkdir(outDir, { recursive: true });

  const profiles = listGameConfigProfiles()
    .map((profile) => profile.id)
    .filter((id) => !onlyProfile || id === onlyProfile);

  for (const profileId of profiles) {
    const report = buildParReport(profileId, spins, seed);
    const markdown = renderParReportMarkdown(report);
    await writeFile(join(outDir, `PAR_${profileId}.md`), markdown, "utf8");
    await writeFile(
      join(outDir, `PAR_${profileId}.json`),
      JSON.stringify(report, null, 2),
      "utf8"
    );
    console.log(
      `PAR_${profileId}: RTP ${(report.simulated.achievedRtp * 100).toFixed(4)}% ` +
        `hit ${(report.simulated.hitRate * 100).toFixed(2)}% ` +
        `bonus 1:${report.simulated.bonusTriggerRate > 0 ? (1 / report.simulated.bonusTriggerRate).toFixed(0) : "—"}`
    );
  }
};

if (process.argv[1]?.includes("par-report.ts")) {
  void runParReportCli();
}
