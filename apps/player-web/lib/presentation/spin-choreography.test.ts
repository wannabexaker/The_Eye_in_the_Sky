import assert from "node:assert/strict";
import test from "node:test";
import type { CascadeStep, CascadeWin, SpinResult, SymbolId } from "@eye/game-engine";
import { buildSpinChoreography } from "./spin-choreography";
import { getSpinPresentationProfile } from "./spin-state-machine";

const buildBoard = (symbol: SymbolId = "ashen_sigil"): SymbolId[][] =>
  Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => symbol));

const buildWin = (row: number, col: number, payout = 0.1): CascadeWin => ({
  symbol: "broken_halo",
  size: 5,
  payoutMultiplier: 1,
  payout,
  cells: [
    { row, col },
    { row, col: col + 1 },
    { row: row + 1, col },
    { row: row + 1, col: col + 1 },
    { row: row + 2, col }
  ]
});

const buildCascade = (index: number, stepWin: number): CascadeStep => ({
  index,
  boardBefore: buildBoard(index % 2 === 0 ? "broken_halo" : "ritual_dagger"),
  wins: [buildWin(index % 3, index % 2, stepWin)],
  modifierEvents: [],
  cascadeMultiplier: 1,
  stickyMultiplier: 1,
  settleWinMultiplier: 1,
  appliedWinMultiplier: 1,
  stepWin,
  boardAfter: buildBoard(index % 2 === 0 ? "sealed_scroll" : "seraphim_feather")
});

const buildResult = (cascades: CascadeStep[], overrides: Partial<SpinResult> = {}): SpinResult => {
  const totalWin = cascades.reduce((acc, cascade) => acc + cascade.stepWin, 0);
  return {
    seedUsed: 1,
    configVersion: "test",
    bet: 0.1,
    mode: "base",
    appliedWinMultiplier: 1,
    initialBoard: buildBoard(),
    endingBoard: cascades.at(-1)?.boardAfter ?? buildBoard("wild"),
    evaluatedWins: [],
    cascades,
    multipliersTriggered: [],
    modifiersTriggered: [],
    meterProgress: {
      before: 0,
      added: 0,
      after: 0,
      target: 17
    },
    bonusTriggered: false,
    bonusStateBefore: null,
    bonusStateAfter: null,
    totalWin,
    walletDelta: totalWin - 0.1,
    roundSummary: {
      roundId: `round-${cascades.length}-${totalWin}`,
      timestamp: new Date(0).toISOString(),
      bet: 0.1,
      totalWin,
      walletDelta: totalWin - 0.1,
      mode: "base",
      cascades: cascades.length,
      appliedWinMultiplier: 1,
      bonusTriggered: false,
      summaryLabel: "test"
    },
    debugMetadata: {
      chargedBet: 0.1,
      totalCascades: cascades.length,
      totalEvaluatedWins: 0,
      totalModifierEvents: 0,
      totalMultiplierEvents: 0,
      endingBalance: 100
    },
    balanceAfter: 100,
    nextState: {
      balance: 100,
      bonusMeter: 0,
      bonusState: null,
      lastTotalWin: totalWin,
      samsaraCollectedBets: 0,
      samsaraContributionLog: []
    },
    board: cascades.at(-1)?.boardAfter ?? buildBoard(),
    ...overrides
  };
};

const normalProfile = getSpinPresentationProfile("normal");
const build = (result: SpinResult) =>
  buildSpinChoreography(result, normalProfile, { autoContinueNeverStop: false });

test("no-win choreography stays short and ordered", () => {
  const run = build(buildResult([]));

  assert.ok(run.totalDurationMs >= 1400 && run.totalDurationMs <= 1800);
  assert.deepEqual(run.events.map((event) => event.type), [
    "spin_start",
    "board_drop",
    "win_scan",
    "round_end"
  ]);
});

test("one-cascade choreography includes visual and audio beats", () => {
  const run = build(buildResult([buildCascade(0, 0.12)]));
  const eventTypes = run.events.map((event) => event.type);

  assert.ok(run.totalDurationMs >= 1900 && run.totalDurationMs <= 2600);
  for (const type of [
    "board_drop",
    "win_scan",
    "symbol_prebreak",
    "symbol_break",
    "cascade_payout",
    "cascade_drop",
    "round_summary"
  ] as const) {
    assert.ok(eventTypes.includes(type), `Missing ${type}`);
  }
  assert.ok(run.events.filter((event) => event.sound).length >= 7);
});

test("four-cascade choreography is compressed but readable", () => {
  const run = build(
    buildResult([
      buildCascade(0, 0.15),
      buildCascade(1, 0.12),
      buildCascade(2, 0.06),
      buildCascade(3, 0.11)
    ])
  );

  assert.ok(run.totalDurationMs >= 3400 && run.totalDurationMs <= 4300, `${run.totalDurationMs}`);
  assert.equal(run.events.filter((event) => event.type === "symbol_break").length, 4);
  assert.equal(run.events.filter((event) => event.type === "cascade_payout").length, 4);
});

test("eight-cascade choreography remains under long-chain target", () => {
  const cascades = Array.from({ length: 8 }, (_, index) => buildCascade(index, 0.08));
  const run = build(buildResult(cascades));

  assert.ok(run.totalDurationMs >= 5200 && run.totalDurationMs <= 6300, `${run.totalDurationMs}`);
  assert.equal(run.events.filter((event) => event.type === "cascade_drop").length, 8);
});

test("choreography builder does not mutate engine result payload", () => {
  const result = buildResult([buildCascade(0, 0.15), buildCascade(1, 0.12)]);
  const before = JSON.stringify(result);

  build(result);

  assert.equal(JSON.stringify(result), before);
});

test("win tier summary sounds map to big, huge, and super thresholds", () => {
  const cases = [
    { totalWin: 0.6, sound: "big_win" },
    { totalWin: 1.4, sound: "huge_win" },
    { totalWin: 2.6, sound: "super_win" }
  ] as const;

  for (const { totalWin, sound } of cases) {
    const result = buildResult([buildCascade(0, totalWin)], {
      totalWin,
      roundSummary: {
        ...buildResult([buildCascade(0, totalWin)]).roundSummary,
        totalWin
      }
    });
    const run = build(result);

    assert.ok(run.events.some((event) => event.type === "round_summary" && event.sound?.event === sound));
  }
});

test("multiplier, bonus, and super win cues are represented", () => {
  const cascade = buildCascade(0, 2.8);
  cascade.modifierEvents = [
    {
      type: "seraphim_eye_multiplier",
      source: "seraphim_eye",
      cascadeIndex: 0,
      awardedMultiplier: 3,
      cells: [{ row: 0, col: 0 }]
    }
  ];
  const result = buildResult([cascade], {
    totalWin: 2.8,
    bonusTriggered: true,
    roundSummary: {
      ...buildResult([cascade]).roundSummary,
      roundId: "bonus-super",
      totalWin: 2.8,
      bonusTriggered: true
    }
  });
  const run = build(result);

  assert.ok(run.events.some((event) => event.type === "multiplier_apply"));
  assert.ok(run.events.some((event) => event.type === "bonus_trigger"));
  assert.ok(run.events.some((event) => event.sound?.event === "super_win"));
});
