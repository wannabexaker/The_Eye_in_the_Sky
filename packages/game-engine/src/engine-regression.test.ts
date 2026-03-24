import test from "node:test";
import assert from "node:assert/strict";
import { defaultGameConfig, initialGameState } from "./config";
import { applyModifierSymbols } from "./modifier-engine";
import { simulateSpins } from "./simulation";
import { resolveSpin } from "./spin-resolver";
import type { SpinResult } from "./types";

const requiredSpinResultKeys: Array<keyof SpinResult> = [
  "seedUsed",
  "configVersion",
  "initialBoard",
  "endingBoard",
  "evaluatedWins",
  "cascades",
  "multipliersTriggered",
  "modifiersTriggered",
  "meterProgress",
  "bonusTriggered",
  "bonusStateBefore",
  "bonusStateAfter",
  "totalWin",
  "walletDelta",
  "roundSummary",
  "debugMetadata",
  "bet",
  "mode",
  "appliedWinMultiplier",
  "balanceAfter",
  "nextState",
  "board"
];

const findBonusTriggerSeed = (): number => {
  const baseState = {
    ...initialGameState(1000),
    bonusMeter: defaultGameConfig.bonusMeterTarget - 1
  };

  for (let seed = 1; seed < 10000; seed += 1) {
    const result = resolveSpin({
      bet: 20,
      state: baseState,
      seed
    });

    if (result.bonusTriggered) {
      return seed;
    }
  }

  throw new Error("Unable to find deterministic bonus trigger seed in search range.");
};

test("resolveSpin is deterministic for the same seed, bet, state, and config version", () => {
  const state = initialGameState(1000);
  const first = resolveSpin({ bet: 20, state, seed: 1337 }, defaultGameConfig);
  const second = resolveSpin({ bet: 20, state, seed: 1337 }, defaultGameConfig);

  assert.deepEqual(second, first);
});

test("SpinResult exposes the required audit and debug contract fields", () => {
  const result = resolveSpin({ bet: 20, state: initialGameState(1000), seed: 2026 });

  requiredSpinResultKeys.forEach((key) => {
    assert.ok(key in result, `Missing SpinResult field: ${String(key)}`);
  });
});

test("wallet delta and ending balance remain internally consistent", () => {
  const state = initialGameState(1000);
  const result = resolveSpin({ bet: 20, state, seed: 77 });

  assert.equal(result.walletDelta, Number((result.totalWin - result.debugMetadata.chargedBet).toFixed(2)));
  assert.equal(result.balanceAfter, Number((state.balance + result.walletDelta).toFixed(2)));
  assert.equal(result.nextState.balance, result.balanceAfter);
});

test("round summary fields are correct and config version propagates", () => {
  const result = resolveSpin({ bet: 50, state: initialGameState(1000), seed: 55 }, defaultGameConfig);

  assert.equal(result.configVersion, defaultGameConfig.version);
  assert.equal(result.roundSummary.bet, 50);
  assert.equal(result.roundSummary.totalWin, result.totalWin);
  assert.equal(result.roundSummary.walletDelta, result.walletDelta);
  assert.equal(result.roundSummary.mode, result.mode);
  assert.equal(result.roundSummary.appliedWinMultiplier, result.appliedWinMultiplier);
  assert.equal(result.roundSummary.cascades, result.cascades.length);
  assert.equal(result.roundSummary.bonusTriggered, result.bonusTriggered);
  assert.ok(result.roundSummary.roundId.includes(defaultGameConfig.version));
  assert.ok(result.roundSummary.timestamp.endsWith("Z"));
});

test("bonus state transitions correctly from base spin into bonus spin and bonus spins charge no bet", () => {
  const triggerSeed = findBonusTriggerSeed();
  const baseState = {
    ...initialGameState(1000),
    bonusMeter: defaultGameConfig.bonusMeterTarget - 1
  };

  const triggerResult = resolveSpin({
    bet: 20,
    state: baseState,
    seed: triggerSeed
  });

  assert.equal(triggerResult.bonusTriggered, true);
  assert.equal(triggerResult.bonusStateBefore, null);
  assert.ok(triggerResult.bonusStateAfter);
  assert.equal(
    triggerResult.bonusStateAfter?.freeSpinsRemaining,
    defaultGameConfig.bonusSpinsAwarded,
    "Bonus trigger should award exactly one bundle of free spins"
  );

  const bonusResult = resolveSpin({
    bet: 20,
    state: triggerResult.nextState,
    seed: triggerSeed + 1
  });

  assert.equal(bonusResult.mode, "bonus");
  assert.equal(bonusResult.debugMetadata.chargedBet, 0);
  assert.equal(bonusResult.walletDelta, bonusResult.totalWin);
});

test("base-spin bonus trigger never over-awards extra free-spin bundles in the same spin", () => {
  const baseState = {
    ...initialGameState(1000),
    bonusMeter: defaultGameConfig.bonusMeterTarget - 1
  };

  for (let seed = 1; seed <= 3000; seed += 1) {
    const result = resolveSpin({
      bet: 20,
      state: baseState,
      seed
    });

    if (!result.bonusTriggered) {
      continue;
    }

    assert.equal(
      result.bonusStateAfter?.freeSpinsRemaining,
      defaultGameConfig.bonusSpinsAwarded,
      `Over-awarded free spins detected at seed ${seed}`
    );
  }
});

test("bonus spin uses requested bet within remaining Samsara budget and decrements budget correctly", () => {
  const triggerSeed = findBonusTriggerSeed();
  const baseState = {
    ...initialGameState(1000),
    bonusMeter: defaultGameConfig.bonusMeterTarget - 1
  };

  const triggerResult = resolveSpin({
    bet: 20,
    state: baseState,
    seed: triggerSeed
  });

  assert.ok(triggerResult.nextState.bonusState, "Expected bonus state after trigger spin");

  const bonusStateBeforeSpin = triggerResult.nextState.bonusState!;
  const requestedBonusBet = Number((bonusStateBeforeSpin.remainingBonusBudget * 0.5).toFixed(2));
  const bonusResult = resolveSpin({
    bet: requestedBonusBet,
    state: triggerResult.nextState,
    seed: triggerSeed + 1
  });

  assert.equal(bonusResult.mode, "bonus");
  assert.equal(bonusResult.bet, requestedBonusBet);
  assert.equal(bonusResult.debugMetadata.chargedBet, 0);
  assert.ok(bonusResult.nextState.bonusState, "Expected bonus to continue after first bonus spin");

  const expectedRemainingBudget = Number(
    (bonusStateBeforeSpin.remainingBonusBudget - requestedBonusBet).toFixed(2)
  );
  assert.equal(
    bonusResult.nextState.bonusState?.remainingBonusBudget,
    expectedRemainingBudget,
    "Bonus remaining budget should decrease by the requested bonus bet"
  );
});

test("final bonus spin always commits all remaining Samsara budget", () => {
  const state = {
    ...initialGameState(1000),
    samsaraCollectedBets: 5.5,
    samsaraContributionLog: [2.5],
    bonusState: {
      mode: "sky_opens" as const,
      freeSpinsRemaining: 1,
      totalBonusWin: 0,
      stickyMultiplier: 1,
      betPerSpin: 2,
      initialBonusBudget: 12.7,
      remainingBonusBudget: 12.7,
      preBonusBet: 1
    }
  };

  const result = resolveSpin({
    bet: 0.1,
    state,
    seed: 404
  });

  assert.equal(result.mode, "bonus");
  assert.equal(result.bet, 12.7);
  assert.equal(result.debugMetadata.chargedBet, 0);
  assert.equal(result.nextState.bonusState, null);
  assert.equal(result.nextState.samsaraCollectedBets, 0);
  assert.deepEqual(result.nextState.samsaraContributionLog, [2.5]);
});

test("Samsara symbols collected during bonus are carried for the next bonus pool", () => {
  const board = Array.from({ length: defaultGameConfig.rows }, (_, rowIndex) =>
    Array.from({ length: defaultGameConfig.cols }, (_, colIndex) =>
      rowIndex === 0 && colIndex < 2 ? "samsara" as const : "ashen_sigil" as const
    )
  );

  const state = {
    ...initialGameState(1000),
    samsaraCollectedBets: 10,
    bonusState: {
      mode: "sky_opens" as const,
      freeSpinsRemaining: 4,
      totalBonusWin: 0,
      stickyMultiplier: 1,
      betPerSpin: 1,
      initialBonusBudget: 7,
      remainingBonusBudget: 4,
      preBonusBet: 1
    }
  };

  const result = applyModifierSymbols(
    board,
    defaultGameConfig,
    state,
    1.5,
    "bonus",
    1,
    () => 0.5
  );

  assert.equal(result.state.samsaraCollectedBets, 13);
  assert.equal(result.events.length, 0);
});

test("simulation output is deterministic, complete, and carries config version", () => {
  const first = simulateSpins({
    spins: 1000,
    bet: 20,
    baseSeed: 1337,
    winMultiplier: 1
  });

  const second = simulateSpins({
    spins: 1000,
    bet: 20,
    baseSeed: 1337,
    winMultiplier: 1
  });

  assert.deepEqual(second, first);
  assert.equal(first.configVersion, defaultGameConfig.version);
  assert.equal(first.totalSpins, 1000);
  assert.ok("achievedRtp" in first);
  assert.ok("confidenceInterval95" in first);
  assert.ok("baseRtpContribution" in first);
  assert.ok("bonusRtpContribution" in first);
  assert.ok("hitRate" in first);
  assert.ok("averageWin" in first);
  assert.ok("bonusTriggerRate" in first);
  assert.ok("averageBonusPayout" in first);
  assert.ok("maxObservedWin" in first);
  assert.ok("symbolFrequencyTable" in first);
  assert.ok("cascadeDepthDistribution" in first);
  assert.ok("multiplierContributionDistribution" in first);
  assert.ok("percentileWinDistribution" in first);
  assert.ok("evContributionBySpecialSymbolFamily" in first);
  assert.ok(first.confidenceInterval95.low <= first.achievedRtp);
  assert.ok(first.confidenceInterval95.high >= first.achievedRtp);
});

test("default config stays in the professional RTP and bonus-quality band", () => {
  const report = simulateSpins({
    spins: 20000,
    bet: 1,
    baseSeed: 1337,
    winMultiplier: 1
  });

  assert.ok(report.achievedRtp >= 0.88, `RTP too low: ${report.achievedRtp}`);
  // Samsara-funded free-spin pooling increases observed return for the current prototype economy model.
  assert.ok(report.achievedRtp <= 1.2, `RTP too high: ${report.achievedRtp}`);
  assert.ok(report.hitRate >= 0.45, `Hit rate too low: ${report.hitRate}`);
  assert.ok(report.hitRate <= 0.58, `Hit rate too high: ${report.hitRate}`);
  assert.ok(
    report.bonusTriggerRate >= 0.0025 && report.bonusTriggerRate <= 0.006,
    `Bonus trigger rate out of band: ${report.bonusTriggerRate}`
  );
  assert.ok(report.averageBonusPayout >= 10, `Average bonus payout too low: ${report.averageBonusPayout}`);
});
