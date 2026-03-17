import type { ClusterCell, GameConfig, SymbolId } from "./types";
import { pickWeightedSymbol } from "./rng";

export const removeWinningCells = (
  board: SymbolId[][],
  cells: ClusterCell[]
): (SymbolId | null)[][] => {
  const nextBoard: (SymbolId | null)[][] = board.map((row) =>
    row.map((cell) => cell)
  );

  for (const cell of cells) {
    nextBoard[cell.row][cell.col] = null;
  }

  return nextBoard;
};

export const collapseBoard = (
  board: (SymbolId | null)[][],
  config: GameConfig,
  random: () => number
): SymbolId[][] => {
  const rows = config.rows;
  const cols = config.cols;
  const nextBoard: SymbolId[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => "ashen_sigil")
  );

  for (let col = 0; col < cols; col += 1) {
    const compacted: SymbolId[] = [];

    for (let row = rows - 1; row >= 0; row -= 1) {
      const symbol = board[row][col];
      if (symbol !== null) {
        compacted.push(symbol);
      }
    }

    while (compacted.length < rows) {
      compacted.push(pickWeightedSymbol(config.symbolWeights, random));
    }

    for (let row = rows - 1, index = 0; row >= 0; row -= 1, index += 1) {
      nextBoard[row][col] = compacted[index];
    }
  }

  return nextBoard;
};
