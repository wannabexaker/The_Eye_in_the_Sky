import { cloneBoard } from "./board";
import { createBonusState } from "./bonus-engine";
import type {
  ClusterCell,
  GameConfig,
  GameState,
  ModifierEvent,
  SymbolId
} from "./types";

const collectSymbolCells = (board: SymbolId[][], symbol: SymbolId): ClusterCell[] => {
  const cells: ClusterCell[] = [];

  board.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      if (value === symbol) {
        cells.push({ row: rowIndex, col: colIndex });
      }
    });
  });

  return cells;
};

const pickWeightedMultiplierValue = (
  config: GameConfig,
  mode: "base" | "bonus",
  random: () => number
): number => {
  const options = config.multiplierValueWeights.filter(
    (entry) => mode === "bonus" || !entry.bonusOnly
  );

  if (options.length === 0) {
    return 1;
  }

  const totalWeight = options.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = random() * totalWeight;

  for (const entry of options) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.value;
    }
  }

  return options[options.length - 1]?.value ?? 1;
};

const resolveConstellationMultiplierValues = (
  config: GameConfig,
  mode: "base" | "bonus",
  eyeCount: number,
  random: () => number
) => {
  const values = Array.from({ length: eyeCount }, () =>
    pickWeightedMultiplierValue(config, mode, random)
  );

  const extremeValue = values.find((value) => value >= 500);
  if (extremeValue) {
    return [extremeValue];
  }

  const highValues = values.filter((value) => value >= 100).sort((a, b) => b - a);
  const lowValues = values.filter((value) => value < 100);
  const normalizedValues =
    highValues.length > 1 ? [highValues[0], ...lowValues] : values;

  const cappedTotal = Math.min(
    1000,
    normalizedValues.reduce((sum, value) => sum + value, 0)
  );

  return [cappedTotal];
};

const getScatterReward = (config: GameConfig, scatterCount: number) => {
  let matched = null as (typeof config.scatterRewards)[number] | null;

  for (const reward of config.scatterRewards) {
    if (scatterCount >= reward.count) {
      matched = reward;
    }
  }

  return matched;
};

const applyMainModifierSymbols = (
  board: SymbolId[][],
  config: GameConfig,
  state: GameState,
  bet: number,
  mode: "base" | "bonus",
  cascadeIndex: number,
  random: () => number
): {
  board: SymbolId[][];
  state: GameState;
  events: ModifierEvent[];
  settleWinMultiplier: number;
} => {
  const nextBoard = cloneBoard(board);
  const nextState: GameState = {
    ...state,
    bonusState: state.bonusState ? { ...state.bonusState } : null
  };
  const events: ModifierEvent[] = [];
  const maxStickyMultiplier = config.maxBonusMultiplier;

  const seraphimEyeCells = collectSymbolCells(nextBoard, "seraphim_eye");
  if (seraphimEyeCells.length > 0) {
    const transformCount = Math.min(1 + Math.floor(random() * 2), config.rows * config.cols);
    const transformedCells: ClusterCell[] = [];

    for (let index = 0; index < transformCount; index += 1) {
      const row = Math.floor(random() * config.rows);
      const col = Math.floor(random() * config.cols);
      if (
        nextBoard[row][col] !== "seraphim_eye" &&
        nextBoard[row][col] !== "samsara" &&
        nextBoard[row][col] !== "ouroboros" &&
        nextBoard[row][col] !== "panepoptis_ophthalmos"
      ) {
        nextBoard[row][col] = "wild";
        transformedCells.push({ row, col });
      }
    }

    const multiplierBoost = mode === "bonus" && random() < 0.12 ? 1 : 0;
    if (nextState.bonusState && multiplierBoost > 0) {
      nextState.bonusState.stickyMultiplier = Math.min(
        maxStickyMultiplier,
        nextState.bonusState.stickyMultiplier + multiplierBoost
      );
    }

    events.push({
      type: "seraphim_eye",
      cascadeIndex,
      source: "seraphim_eye",
      transformedCells,
      multiplierBoost
    });
  }

  const samsaraCells = collectSymbolCells(nextBoard, "samsara");
  if (samsaraCells.length > 0) {
    const collectedAmount = Number((bet * samsaraCells.length).toFixed(2));
    const totalCollected = Number((nextState.samsaraCollectedBets + collectedAmount).toFixed(2));
    nextState.samsaraCollectedBets = totalCollected;

    if (mode === "base") {
      // Once bonus state exists during a base-spin cascade chain, keep meter locked
      // and avoid awarding additional free-spin bundles from the same resolved spin.
      if (nextState.bonusState) {
        nextState.bonusMeter = config.bonusMeterTarget;
        return { board: nextBoard, state: nextState, events, settleWinMultiplier: 1 };
      }

      const bonusMeter = nextState.bonusMeter + samsaraCells.length;
      if (bonusMeter >= config.bonusMeterTarget) {
        nextState.bonusMeter = config.bonusMeterTarget;
        const spinsAwarded = config.bonusSpinsAwarded;
        const bonusBetPerSpin = Number((totalCollected / spinsAwarded).toFixed(2));
        nextState.bonusState = createBonusState(
          config,
          bonusBetPerSpin,
          totalCollected,
          bet
        );

        events.push({
          type: "samsara_bonus_trigger",
          cascadeIndex,
          source: "samsara",
          freeSpinsAwarded: spinsAwarded,
          collectedAmount,
          bonusBetPerSpin
        });
      } else {
        nextState.bonusMeter = bonusMeter;
      }
    }
  }

  const ouroborosCells = collectSymbolCells(nextBoard, "ouroboros");
  if (ouroborosCells.length > 0 && nextState.bonusState) {
    const awardedMultiplier = 1;
    nextState.bonusState.stickyMultiplier = Math.min(
      maxStickyMultiplier,
      nextState.bonusState.stickyMultiplier + awardedMultiplier
    );

    events.push({
      type: "ouroboros",
      cascadeIndex,
      source: "ouroboros",
      awardedMultiplier
    });
  }

  const panepoptisCells = collectSymbolCells(nextBoard, "panepoptis_ophthalmos");
  if (panepoptisCells.length > 0) {
    const targetColumn = Math.floor(random() * config.cols);
    const awardedMultiplier = mode === "bonus" ? 1 : 0;
    const transformedRows = new Set<number>();

    while (transformedRows.size < Math.min(3, config.rows)) {
      transformedRows.add(Math.floor(random() * config.rows));
    }

    for (const row of transformedRows) {
      if (
        nextBoard[row][targetColumn] !== "samsara" &&
        nextBoard[row][targetColumn] !== "seraphim_eye" &&
        nextBoard[row][targetColumn] !== "ouroboros" &&
        nextBoard[row][targetColumn] !== "panepoptis_ophthalmos"
      ) {
        nextBoard[row][targetColumn] = "wild";
      }
    }

    if (nextState.bonusState) {
      nextState.bonusState.stickyMultiplier = Math.min(
        maxStickyMultiplier,
        nextState.bonusState.stickyMultiplier + awardedMultiplier
      );
    }

    events.push({
      type: "panepoptis_ophthalmos",
      cascadeIndex,
      source: "panepoptis_ophthalmos",
      awardedMultiplier,
      targetColumn
    });
  }

  return { board: nextBoard, state: nextState, events, settleWinMultiplier: 1 };
};

const applyConstellationModifierSymbols = (
  board: SymbolId[][],
  config: GameConfig,
  state: GameState,
  bet: number,
  mode: "base" | "bonus",
  cascadeIndex: number,
  random: () => number
): {
  board: SymbolId[][];
  state: GameState;
  events: ModifierEvent[];
  settleWinMultiplier: number;
} => {
  const nextBoard = cloneBoard(board);
  const nextState: GameState = {
    ...state,
    bonusState: state.bonusState ? { ...state.bonusState } : null
  };
  const events: ModifierEvent[] = [];

  const seraphimEyeCells = collectSymbolCells(nextBoard, "seraphim_eye");
  const multiplierValues = resolveConstellationMultiplierValues(
    config,
    mode,
    seraphimEyeCells.length,
    random
  );
  const settleWinMultiplier =
    multiplierValues.length > 0
      ? multiplierValues.reduce((sum, value) => sum + value, 0)
      : 1;

  if (seraphimEyeCells.length > 0) {
    events.push({
      type: "seraphim_eye_multiplier",
      cascadeIndex,
      source: "seraphim_eye",
      awardedMultiplier: settleWinMultiplier,
      cells: seraphimEyeCells
    });
  }

  const samsaraCells = collectSymbolCells(nextBoard, "samsara");
  const scatterReward = getScatterReward(config, samsaraCells.length);

  if (scatterReward && samsaraCells.length >= scatterReward.count) {
    const bonusBetPerSpin = Number(bet.toFixed(2));
    const awardedBudget = Number((bonusBetPerSpin * scatterReward.freeSpinsAwarded).toFixed(2));
    let awardedFreeSpins = 0;

    if (mode === "base") {
      if (!nextState.bonusState) {
        nextState.bonusState = createBonusState(
          {
            ...config,
            bonusSpinsAwarded: scatterReward.freeSpinsAwarded
          },
          bonusBetPerSpin,
          awardedBudget,
          bet
        );
        awardedFreeSpins = scatterReward.freeSpinsAwarded;
      }
    } else if (nextState.bonusState) {
      nextState.bonusState.freeSpinsRemaining += scatterReward.freeSpinsAwarded;
      nextState.bonusState.initialBonusBudget = Number(
        (nextState.bonusState.initialBonusBudget + awardedBudget).toFixed(2)
      );
      nextState.bonusState.remainingBonusBudget = Number(
        (nextState.bonusState.remainingBonusBudget + awardedBudget).toFixed(2)
      );
      nextState.bonusState.betPerSpin = Number(
        (
          nextState.bonusState.remainingBonusBudget /
          Math.max(nextState.bonusState.freeSpinsRemaining, 1)
        ).toFixed(2)
      );
      awardedFreeSpins = scatterReward.freeSpinsAwarded;
    }

    if (awardedFreeSpins > 0) {
      events.push({
        type: "samsara_bonus_trigger",
        cascadeIndex,
        source: "samsara",
        freeSpinsAwarded: awardedFreeSpins,
        collectedAmount: Number((bet * scatterReward.payoutMultiplier).toFixed(2)),
        bonusBetPerSpin
      });
    }
  }

  return { board: nextBoard, state: nextState, events, settleWinMultiplier };
};

export const applyModifierSymbols = (
  board: SymbolId[][],
  config: GameConfig,
  state: GameState,
  bet: number,
  mode: "base" | "bonus",
  cascadeIndex: number,
  random: () => number
): {
  board: SymbolId[][];
  state: GameState;
  events: ModifierEvent[];
  settleWinMultiplier: number;
} => {
  return config.variantId === "constellation_simple"
    ? applyConstellationModifierSymbols(
        board,
        config,
        state,
        bet,
        mode,
        cascadeIndex,
        random
      )
    : applyMainModifierSymbols(board, config, state, bet, mode, cascadeIndex, random);
};
