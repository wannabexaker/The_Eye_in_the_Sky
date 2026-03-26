import { cloneBoard, createBoard } from "./board";
import { defaultGameConfig } from "./config";
import { collapseBoard, removeWinningCells } from "./cascade-resolver";
import { resolveWins } from "./cluster-resolver";
import { createRuntimeSeed, createSeededRandom } from "./rng";
import { applyModifierSymbols } from "./modifier-engine";
import { calculateStepWin } from "./payout-engine";
import type {
  BonusState,
  CascadeStep,
  CascadeWin,
  EvaluatedWin,
  GameConfig,
  GameState,
  MeterProgress,
  ModifierEvent,
  MultiplierTrigger,
  RoundSummary,
  SpinOptions,
  SpinResult
} from "./types";

const cloneBonusState = (bonusState: BonusState | null): BonusState | null =>
  bonusState
    ? {
        ...bonusState
      }
    : null;

const cloneState = (state: GameState): GameState => ({
  ...state,
  bonusState: cloneBonusState(state.bonusState)
});

const createRoundId = (
  configVersion: string,
  seedUsed: number,
  bet: number,
  mode: "base" | "bonus"
): string => `${configVersion}-${mode}-${bet}-${seedUsed}`;

const createTimestamp = (seedUsed: number): string =>
  new Date(seedUsed * 1000).toISOString();

const uniqueWinningCells = (wins: CascadeWin[]) => {
  const map = new Map<string, { row: number; col: number }>();

  for (const win of wins) {
    for (const cell of win.cells) {
      map.set(`${cell.row}:${cell.col}`, cell);
    }
  }

  return [...map.values()];
};

const collectRemovedCells = (wins: CascadeWin[], modifierEvents: ModifierEvent[]) => {
  const map = new Map<string, { row: number; col: number }>();

  for (const cell of uniqueWinningCells(wins)) {
    map.set(`${cell.row}:${cell.col}`, cell);
  }

  for (const event of modifierEvents) {
    if (event.type !== "seraphim_eye_multiplier") {
      continue;
    }

    for (const cell of event.cells) {
      map.set(`${cell.row}:${cell.col}`, cell);
    }
  }

  return [...map.values()];
};

const buildSummaryLabel = (
  totalWin: number,
  appliedWinMultiplier: number,
  cascades: number
) =>
  totalWin > 0
    ? `WIN ${totalWin.toFixed(2)} | x${appliedWinMultiplier} | ${cascades} cascades`
    : "LOSS";

const collectMultiplierTriggers = (
  appliedWinMultiplier: number,
  cascadeIndex: number,
  cascadeMultiplier: number,
  modifierEvents: ModifierEvent[],
  stepWin: number,
  settleWinMultiplier: number
): MultiplierTrigger[] => {
  const triggers: MultiplierTrigger[] = [];

  if (appliedWinMultiplier > 1) {
    triggers.push({
      source: "applied_win_multiplier",
      cascadeIndex,
      multiplier: appliedWinMultiplier,
      scope: "selection",
      contributionAmount: stepWin
    });
  }

  if (cascadeMultiplier > 1) {
    triggers.push({
      source: "cascade_ladder",
      cascadeIndex,
      multiplier: cascadeMultiplier,
      scope: "cascade",
      contributionAmount: stepWin
    });
  }

  if (settleWinMultiplier > 1) {
    triggers.push({
      source: "seraphim_eye",
      cascadeIndex,
      multiplier: settleWinMultiplier,
      scope: "modifier",
      contributionAmount: stepWin
    });
  }

  for (const event of modifierEvents) {
    if (event.type === "seraphim_eye" && event.multiplierBoost > 0) {
      triggers.push({
        source: "seraphim_eye",
        cascadeIndex,
        multiplier: event.multiplierBoost,
        scope: "modifier",
        contributionAmount: stepWin
      });
    }

    if (event.type === "ouroboros") {
      triggers.push({
        source: "ouroboros",
        cascadeIndex,
        multiplier: event.awardedMultiplier,
        scope: "bonus",
        contributionAmount: stepWin
      });
    }

    if (event.type === "panepoptis_ophthalmos" && event.awardedMultiplier > 0) {
      triggers.push({
        source: "panepoptis_ophthalmos",
        cascadeIndex,
        multiplier: event.awardedMultiplier,
        scope: "modifier",
        contributionAmount: stepWin
      });
    }
  }

  return triggers;
};

export const resolveSpin = (
  options: SpinOptions,
  config: GameConfig = defaultGameConfig
): SpinResult => {
  const seedUsed = options.seed ?? createRuntimeSeed();
  const random = createSeededRandom(seedUsed);
  const requestedWinMultiplier = options.winMultiplier ?? 1;
  const appliedWinMultiplier = config.winMultiplierOptions.includes(requestedWinMultiplier)
    ? requestedWinMultiplier
    : 1;
  const mode = options.state.bonusState?.freeSpinsRemaining ? "bonus" : "base";
  let chargedBet = mode === "bonus" ? 0 : options.bet;
  let effectiveBet = options.bet;

  if (mode === "bonus" && options.state.bonusState) {
    const spinsRemaining = Math.max(options.state.bonusState.freeSpinsRemaining, 1);
    const remainingBudget = Number(
      Math.max(0, options.state.bonusState.remainingBonusBudget).toFixed(2)
    );
    const fallbackEqualBet = Number((remainingBudget / spinsRemaining).toFixed(2));
    const requestedBet = Number(options.bet.toFixed(2));
    const normalizedRequestedBet =
      Number.isFinite(requestedBet) && requestedBet > 0 ? requestedBet : fallbackEqualBet;

    const boundedRequestedBet = Math.max(0, Math.min(normalizedRequestedBet, remainingBudget));

    // Force all-in on the final bonus spin so no budget is left stranded.
    effectiveBet = Number((spinsRemaining === 1 ? remainingBudget : boundedRequestedBet).toFixed(2));
    chargedBet = 0;
  }
  const bonusStateBefore = cloneBonusState(options.state.bonusState);
  const meterBefore = options.state.bonusMeter;
  const samsaraCollectedBefore = options.state.samsaraCollectedBets;

  let state: GameState = {
    ...cloneState(options.state),
    balance: Number((options.state.balance - chargedBet).toFixed(2))
  };

  const initialBoard = createBoard(config, random);
  let board = cloneBoard(initialBoard);
  const cascades: CascadeStep[] = [];
  const evaluatedWins: EvaluatedWin[] = [];
  const modifiersTriggered: ModifierEvent[] = [];
  const multipliersTriggered: MultiplierTrigger[] = [];
  let totalWin = 0;
  let cascadeIndex = 0;

  while (cascadeIndex < config.maxCascadeSteps) {
    const modifierResult = applyModifierSymbols(
      board,
      config,
      state,
      effectiveBet,
      mode,
      cascadeIndex + 1,
      random
    );
    const boardBefore = cloneBoard(modifierResult.board);
    board = modifierResult.board;
    state = modifierResult.state;

    const wins = resolveWins(board, config, effectiveBet);
    if (wins.length === 0) {
      modifiersTriggered.push(...modifierResult.events);
      break;
    }

    const ladderIndex = Math.min(cascadeIndex, config.cascadeMultiplierLadder.length - 1);
    const cascadeMultiplier = config.cascadeMultiplierLadder[ladderIndex];
    const stickyMultiplier = state.bonusState?.stickyMultiplier ?? 1;
    const settleWinMultiplier = Math.max(1, modifierResult.settleWinMultiplier);
    const stepWin = calculateStepWin(
      wins,
      cascadeMultiplier,
      stickyMultiplier,
      settleWinMultiplier,
      appliedWinMultiplier
    );

    totalWin = Number((totalWin + stepWin).toFixed(2));

    const evaluatedForStep = wins.map<EvaluatedWin>((win) => ({
      ...win,
      cascadeIndex: cascadeIndex + 1,
      totalContribution: Number(
        (
          win.payout *
          cascadeMultiplier *
          stickyMultiplier *
          settleWinMultiplier *
          appliedWinMultiplier
        ).toFixed(2)
      )
    }));

    evaluatedWins.push(...evaluatedForStep);
    modifiersTriggered.push(...modifierResult.events);
    multipliersTriggered.push(
      ...collectMultiplierTriggers(
        appliedWinMultiplier,
        cascadeIndex + 1,
        cascadeMultiplier,
        modifierResult.events,
        stepWin,
        settleWinMultiplier
      )
    );

    const winningCells = collectRemovedCells(wins, modifierResult.events);
    const removed = removeWinningCells(board, winningCells);
    const boardAfter = collapseBoard(removed, config, random);

    cascades.push({
      index: cascadeIndex + 1,
      boardBefore,
      wins,
      modifierEvents: modifierResult.events,
      cascadeMultiplier,
      stickyMultiplier,
      settleWinMultiplier,
      appliedWinMultiplier,
      stepWin,
      boardAfter
    });

    board = boardAfter;
    cascadeIndex += 1;
  }

  if (mode === "bonus" && state.bonusState) {
    const remainingBonusBudget = Number(
      Math.max(0, state.bonusState.remainingBonusBudget - effectiveBet).toFixed(2)
    );
    const nextSpinsRemaining = Math.max(state.bonusState.freeSpinsRemaining - 1, 0);
    const nextDefaultBet =
      nextSpinsRemaining > 0
        ? Number((remainingBonusBudget / nextSpinsRemaining).toFixed(2))
        : 0;

    state.bonusState = {
      ...state.bonusState,
      freeSpinsRemaining: nextSpinsRemaining,
      totalBonusWin: Number((state.bonusState.totalBonusWin + totalWin).toFixed(2)),
      remainingBonusBudget,
      betPerSpin: nextDefaultBet
    };

    if (state.bonusState.freeSpinsRemaining === 0) {
      const carryOverCollected = Number(
        Math.max(0, state.samsaraCollectedBets - state.bonusState.initialBonusBudget).toFixed(2)
      );
      state.bonusState = null;
      state.bonusMeter = 0;
      state.samsaraCollectedBets = carryOverCollected;
    }
  }

  const collectedThisSpin = Number((state.samsaraCollectedBets - samsaraCollectedBefore).toFixed(2));
  if (collectedThisSpin > 0) {
    state.samsaraContributionLog = [...state.samsaraContributionLog, collectedThisSpin];
  }

  state.balance = Number((state.balance + totalWin).toFixed(2));
  state.lastTotalWin = totalWin;

  const walletDelta = Number((totalWin - chargedBet).toFixed(2));
  const meterProgress: MeterProgress = {
    before: meterBefore,
    added:
      config.bonusTriggerMode === "scatter"
        ? 0
        : state.bonusMeter >= meterBefore
        ? state.bonusMeter - meterBefore
        : state.bonusMeter + config.bonusMeterTarget - meterBefore,
    after: config.bonusTriggerMode === "scatter" ? 0 : state.bonusMeter,
    target: config.bonusMeterTarget
  };
  const bonusTriggered = modifiersTriggered.some(
    (event) => event.type === "samsara_bonus_trigger"
  );
  const roundId =
    options.roundId ?? createRoundId(config.version, seedUsed, options.bet, mode);
  const timestamp = options.timestamp ?? createTimestamp(seedUsed);
  const roundSummary: RoundSummary = {
    roundId,
    timestamp,
    bet: effectiveBet,
    totalWin,
    walletDelta,
    mode,
    cascades: cascades.length,
    appliedWinMultiplier,
    bonusTriggered,
    summaryLabel: buildSummaryLabel(totalWin, appliedWinMultiplier, cascades.length)
  };
  const nextState = cloneState(state);

  return {
    seedUsed,
    configVersion: config.version,
    bet: effectiveBet,
    mode,
    appliedWinMultiplier,
    initialBoard,
    endingBoard: cloneBoard(board),
    evaluatedWins,
    cascades,
    multipliersTriggered,
    modifiersTriggered,
    meterProgress,
    bonusTriggered,
    bonusStateBefore,
    bonusStateAfter: cloneBonusState(nextState.bonusState),
    totalWin,
    walletDelta,
    roundSummary,
    debugMetadata: {
      chargedBet,
      totalCascades: cascades.length,
      totalEvaluatedWins: evaluatedWins.length,
      totalModifierEvents: modifiersTriggered.length,
      totalMultiplierEvents: multipliersTriggered.length,
      endingBalance: nextState.balance
    },
    balanceAfter: nextState.balance,
    nextState,
    board: cloneBoard(board)
  };
};
