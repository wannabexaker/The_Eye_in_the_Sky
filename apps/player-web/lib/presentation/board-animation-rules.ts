import type { SymbolId } from "@eye/game-engine";
import {
  DEFAULT_SPIN_ANIMATION_SPEED,
  getSpinPresentationProfile,
  type SpinAnimationSpeed,
  type SpinPhase
} from "@/lib/presentation/spin-state-machine";

export const getFloatingTextTimings = (speed: SpinAnimationSpeed = DEFAULT_SPIN_ANIMATION_SPEED) => {
  const profile = getSpinPresentationProfile(speed);
  return {
    holdMs: profile.floatingTextHoldMs,
    fadeMs: profile.floatingTextFadeMs
  };
};

export const FLOATING_TEXT_HOLD_MS = getFloatingTextTimings().holdMs;
export const FLOATING_TEXT_FADE_MS = getFloatingTextTimings().fadeMs;

export const isDefaultAshenBoard = (board: SymbolId[][]) =>
  board.every((row) => row.every((symbol) => symbol === "ashen_sigil"));

export const shouldSuppressBoardDropAnimation = (board: SymbolId[][], spinPhase: SpinPhase) =>
  spinPhase === "IDLE" && isDefaultAshenBoard(board);

export const getFloatingTextAlpha = (
  elapsedMs: number,
  holdMs = FLOATING_TEXT_HOLD_MS,
  fadeMs = FLOATING_TEXT_FADE_MS
) => {
  if (elapsedMs <= holdMs) {
    return 1;
  }

  const fadeProgress = Math.min(1, Math.max(0, (elapsedMs - holdMs) / fadeMs));
  return 1 - fadeProgress;
};
