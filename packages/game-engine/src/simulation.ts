import { defaultGameConfig, initialGameState, resolveGameConfigProfile } from "./config";
import { deriveSpinSeed } from "./rng";
import { addSpinToAggregation, createEmptyAggregationState, finalizeMathReport } from "./math-report";
import { resolveSpin } from "./spin-resolver";
import type { SimulationInput, SimulationResult } from "./types";

declare const process: {
  argv: string[];
};

const parseNumberArg = (flag: string, fallback: number): number => {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return fallback;
  }

  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) ? value : fallback;
};

const formatPercent = (value: number) => `${(value * 100).toFixed(4)}%`;

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

export const simulateSpins = (
  input: SimulationInput,
  config = defaultGameConfig
): SimulationResult => {
  let state = initialGameState(input.startingBalance ?? input.spins * input.bet * 4);
  const aggregation = createEmptyAggregationState(config.version);

  for (let index = 0; index < input.spins; index += 1) {
    const spinSeed = deriveSpinSeed(input.baseSeed, index);
    const requestedBetForSpin = state.bonusState
      ? state.bonusState.betPerSpin
      : input.bet;
    const result = resolveSpin(
      {
        bet: requestedBetForSpin,
        state,
        winMultiplier: input.winMultiplier ?? 1,
        seed: spinSeed
      },
      config
    );

    state = result.nextState;
    addSpinToAggregation(aggregation, result);
  }

  return finalizeMathReport(aggregation, input.bet);
};

export const runSimulationCli = () => {
  const spins = parseNumberArg("--spins", 100000);
  const bet = parseNumberArg("--bet", 20);
  const seed = parseNumberArg("--seed", 1337);
  const winMultiplier = parseNumberArg("--multiplier", 1);
  const profileArgIndex = process.argv.indexOf("--profile");
  const profileId = profileArgIndex === -1 ? undefined : process.argv[profileArgIndex + 1];
  const selectedConfig = profileId
    ? resolveGameConfigProfile(profileId).config
    : defaultGameConfig;

  const report = simulateSpins({
    spins,
    bet,
    baseSeed: seed,
    winMultiplier
  }, selectedConfig);

  console.log("The Eye in the Sky simulation");
  console.log(`Config version: ${report.configVersion}`);
  console.log(`Total spins: ${report.totalSpins}`);
  console.log(`Bet: ${formatMoney(bet)}`);
  console.log(`Base seed: ${seed}`);
  console.log(`Win multiplier: x${winMultiplier}`);
  console.log(`Total wagered: ${formatMoney(report.totalWagered)}`);
  console.log(`Total returned: ${formatMoney(report.totalReturned)}`);
  console.log(`RTP achieved: ${formatPercent(report.achievedRtp)}`);
  console.log(
    `RTP confidence interval (95%): ${formatPercent(report.confidenceInterval95.low)} - ${formatPercent(report.confidenceInterval95.high)}`
  );
  console.log(`Base RTP contribution: ${formatPercent(report.baseRtpContribution)}`);
  console.log(`Bonus RTP contribution: ${formatPercent(report.bonusRtpContribution)}`);
  console.log(`Hit rate: ${formatPercent(report.hitRate)}`);
  console.log(`Average win: ${formatMoney(report.averageWin)}`);
  console.log(`Average win on hit: ${formatMoney(report.averageWinOnHit)}`);
  console.log(`Bonus trigger rate: ${formatPercent(report.bonusTriggerRate)}`);
  console.log(`Average bonus payout: ${formatMoney(report.averageBonusPayout)}`);
  console.log(`Max observed win: ${formatMoney(report.maxObservedWin)}`);
  console.log("Cascade depth distribution:");
  console.log(JSON.stringify(report.cascadeDepthDistribution, null, 2));
  console.log("Multiplier contribution distribution:");
  console.log(JSON.stringify(report.multiplierContributionDistribution, null, 2));
  console.log("Percentile win distribution:");
  console.log(JSON.stringify(report.percentileWinDistribution, null, 2));
  console.log("EV contribution by special symbol family:");
  console.log(JSON.stringify(report.evContributionBySpecialSymbolFamily, null, 2));
  console.log("Symbol frequency table:");
  console.log(JSON.stringify(report.symbolFrequencyTable, null, 2));
};

if (process.argv[1]?.includes("simulation.ts")) {
  runSimulationCli();
}
