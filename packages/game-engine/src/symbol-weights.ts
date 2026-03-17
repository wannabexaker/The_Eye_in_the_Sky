import { defaultGameConfig } from "./config";
import type { WeightedSymbol } from "./types";

export const getDefaultSymbolWeights = (): WeightedSymbol[] =>
  defaultGameConfig.symbolWeights.map((entry) => ({ ...entry }));
