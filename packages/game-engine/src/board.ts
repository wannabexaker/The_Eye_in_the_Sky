import type { GameConfig, SymbolId } from "./types";
import { pickWeightedSymbol } from "./rng";

export const createBoard = (
  config: GameConfig,
  random: () => number
): SymbolId[][] =>
  Array.from({ length: config.rows }, () =>
    Array.from({ length: config.cols }, () =>
      pickWeightedSymbol(config.symbolWeights, random)
    )
  );

export const cloneBoard = (board: SymbolId[][]): SymbolId[][] =>
  board.map((row) => [...row]);
