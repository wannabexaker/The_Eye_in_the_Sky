export const SPIN_PHASES = [
  "IDLE",
  "SPIN_START",
  "BOARD_DROP",
  "WIN_CHECK",
  "CASCADE",
  "MODIFIER_APPLY",
  "ROUND_END"
] as const;

export type SpinPhase = (typeof SPIN_PHASES)[number];

export const SPIN_ANIMATION_SPEEDS = ["slow", "normal", "fast", "fast_af"] as const;
export type SpinAnimationSpeed = (typeof SPIN_ANIMATION_SPEEDS)[number];

export const DEFAULT_SPIN_ANIMATION_SPEED: SpinAnimationSpeed = "normal";

/*
Purpose: scales presentation timings for the whole spin feedback flow
Layer: frontend (player-web)
Used by: use-slot-machine.ts and Pixi presentation timing
*/

// Legacy baseline was tuned around 2.2. Keep it as the conversion anchor.
const LEGACY_PRESENTATION_SPEED = 2.2;

// Staged rollout: Normal ships first and is intentionally smoother/slower than current fast feel.
const SPIN_SPEED_MULTIPLIERS: Record<SpinAnimationSpeed, number> = {
  slow: 1.45,
  normal: 1.76,
  fast: 2.2,
  fast_af: 3.1
};

export type SpinPresentationTimings = {
  spinStart: number;
  boardDrop: number;
  winHighlight: number;
  cascadeDrop: number;
  modifierFlash: number;
  bonusTrigger: number;
  roundEnd: number;
};

export type SpinPresentationProfile = {
  speed: SpinAnimationSpeed;
  timings: SpinPresentationTimings;
  winPresentationAutoDismissMs: number;
  bigWinAutoDismissMs: number;
  bonusAnnouncementInputLockMs: number;
  bonusAnnouncementMinVisibleMs: number;
  bonusNonstopAutoContinueMs: number;
  bonusSummaryMinVisibleMs: number;
  autoSpinCadenceMs: number;
  floatingTextHoldMs: number;
  floatingTextFadeMs: number;
};

const scaleBySpeed = (baseMs: number, speed: SpinAnimationSpeed) => {
  const speedMultiplier = SPIN_SPEED_MULTIPLIERS[speed];
  return Math.max(1, Math.round((baseMs * LEGACY_PRESENTATION_SPEED) / speedMultiplier));
};

export const getSpinPresentationProfile = (
  speed: SpinAnimationSpeed = DEFAULT_SPIN_ANIMATION_SPEED
): SpinPresentationProfile => ({
  speed,
  timings: {
    spinStart: scaleBySpeed(140, speed),
    boardDrop: scaleBySpeed(380, speed),
    winHighlight: scaleBySpeed(560, speed),
    cascadeDrop: scaleBySpeed(330, speed),
    modifierFlash: scaleBySpeed(300, speed),
    bonusTrigger: scaleBySpeed(1200, speed),
    roundEnd: scaleBySpeed(500, speed)
  },
  winPresentationAutoDismissMs: scaleBySpeed(2240, speed),
  bigWinAutoDismissMs: scaleBySpeed(2200, speed),
  bonusAnnouncementInputLockMs: scaleBySpeed(1400, speed),
  bonusAnnouncementMinVisibleMs: scaleBySpeed(1400, speed),
  bonusNonstopAutoContinueMs: scaleBySpeed(2000, speed),
  bonusSummaryMinVisibleMs: scaleBySpeed(750, speed),
  autoSpinCadenceMs: scaleBySpeed(180, speed),
  floatingTextHoldMs: scaleBySpeed(700, speed),
  floatingTextFadeMs: scaleBySpeed(1200, speed)
});

// Backward-compatible exports for modules that still consume static defaults.
export const PRESENTATION_TIMINGS = getSpinPresentationProfile().timings;
export const WIN_PRESENTATION_AUTO_DISMISS_MS = getSpinPresentationProfile().winPresentationAutoDismissMs;

export const phaseLabel = (phase: SpinPhase): string =>
  phase
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
