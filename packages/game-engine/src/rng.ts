import type { RngFn, WeightedSymbol, SymbolId } from "./types";

export const normalizeSeed = (seed: number): number => seed >>> 0;

export const createSeededRandom = (seed: number): RngFn => {
  let state = normalizeSeed(seed);

  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

export const createRuntimeSeed = (): number => {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return normalizeSeed(values[0] ?? 0);
  }

  const perfNow = typeof performance !== "undefined" ? performance.now() : 0;
  const now = Date.now() ^ Math.floor(perfNow * 1000);
  return normalizeSeed(now);
};

export const deriveSpinSeed = (baseSeed: number, index: number): number =>
  normalizeSeed(baseSeed + index * 2654435761);

export const pickWeightedSymbol = (
  weights: WeightedSymbol[],
  random: RngFn
): SymbolId => {
  const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
  let roll = random() * totalWeight;

  for (const item of weights) {
    roll -= item.weight;
    if (roll <= 0) {
      return item.symbol;
    }
  }

  return weights[weights.length - 1].symbol;
};
