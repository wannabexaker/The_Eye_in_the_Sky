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
  if (mode === "base" && samsaraCells.length > 0) {
    const collectedAmount = Number((bet * samsaraCells.length).toFixed(2));
    const totalCollected = Number((nextState.samsaraCollectedBets + collectedAmount).toFixed(2));
    nextState.samsaraCollectedBets = totalCollected;

    // Once bonus state exists during a base-spin cascade chain, keep meter locked
    // and avoid awarding additional free-spin bundles from the same resolved spin.
    if (nextState.bonusState) {
      nextState.bonusMeter = config.bonusMeterTarget;
      return { board: nextBoard, state: nextState, events };
    }

    const bonusMeter = nextState.bonusMeter + samsaraCells.length;
    if (bonusMeter >= config.bonusMeterTarget) {
      nextState.bonusMeter = config.bonusMeterTarget;
      const spinsAwarded = config.bonusSpinsAwarded;
      const bonusBetPerSpin = Number((totalCollected / spinsAwarded).toFixed(2));
      nextState.bonusState = createBonusState(config, bonusBetPerSpin);

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

  return { board: nextBoard, state: nextState, events };
};
