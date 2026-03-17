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

/*
Purpose: scales presentation timings for the whole spin feedback flow
Layer: frontend (player-web)
Used by: use-slot-machine.ts and Pixi presentation timing
*/

const PRESENTATION_SPEED = 0.8;

const scaleTiming = (ms: number) => Math.round(ms / PRESENTATION_SPEED);

export const PRESENTATION_TIMINGS = {
  spinStart: scaleTiming(120),
  boardDrop: scaleTiming(350),
  winHighlight: scaleTiming(560),
  cascadeDrop: scaleTiming(240),
  modifierFlash: scaleTiming(300),
  bonusTrigger: scaleTiming(1200),
  roundEnd: scaleTiming(450)
} as const;

export const WIN_PRESENTATION_AUTO_DISMISS_MS = scaleTiming(1150);

export const phaseLabel = (phase: SpinPhase): string =>
  phase
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
