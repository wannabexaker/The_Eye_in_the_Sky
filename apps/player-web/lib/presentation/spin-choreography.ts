import type { CascadeWin, ClusterCell, SpinResult } from "@eye/game-engine";
import type { GameSoundEvent } from "@/lib/audio/sound-manager";
import type {
  SpinAnimationSpeed,
  SpinPresentationProfile,
  SpinPhase
} from "@/lib/presentation/spin-state-machine";

export type SpinChoreographyEventType =
  | "spin_start"
  | "board_drop"
  | "win_scan"
  | "symbol_prebreak"
  | "symbol_break"
  | "cascade_payout"
  | "cascade_drop"
  | "multiplier_apply"
  | "bonus_trigger"
  | "round_summary"
  | "round_end";

export type SpinChoreographySound = {
  event: GameSoundEvent;
  intensity?: number;
  pan?: number;
};

export type SpinChoreographyEvent = {
  type: SpinChoreographyEventType;
  atMs: number;
  durationMs: number;
  phase: SpinPhase;
  cascadeIndex?: number;
  cells?: ClusterCell[];
  wins?: CascadeWin[];
  stepWin?: number;
  runningWin?: number;
  intensity: number;
  sound?: SpinChoreographySound;
};

export type SpinChoreographyRun = {
  runId: string;
  speed: SpinAnimationSpeed;
  totalDurationMs: number;
  summaryAtMs: number;
  events: SpinChoreographyEvent[];
};

export type SpinChoreographyOptions = {
  autoContinueNeverStop: boolean;
};

type CascadePacing = {
  scanMs: number;
  prebreakMs: number;
  breakMs: number;
  payoutMs: number;
  dropMs: number;
  settleMs: number;
};

const SPEED_SCALE: Record<SpinAnimationSpeed, number> = {
  slow: 1.18,
  normal: 1,
  fast: 0.74,
  fast_af: 0.54
};

const NO_WIN_TOTAL_MS: Record<SpinAnimationSpeed, number> = {
  slow: 2050,
  normal: 1650,
  fast: 1180,
  fast_af: 820
};

const roundMs = (value: number) => Math.max(1, Math.round(value));

const scaleMs = (value: number, speed: SpinAnimationSpeed) =>
  roundMs(value * SPEED_SCALE[speed]);

const getCascadePacing = (cascadeIndex: number, speed: SpinAnimationSpeed): CascadePacing => {
  if (cascadeIndex === 0) {
    return {
      scanMs: scaleMs(260, speed),
      prebreakMs: scaleMs(170, speed),
      breakMs: scaleMs(130, speed),
      payoutMs: scaleMs(220, speed),
      dropMs: scaleMs(220, speed),
      settleMs: scaleMs(70, speed)
    };
  }

  if (cascadeIndex <= 2) {
    return {
      scanMs: scaleMs(115, speed),
      prebreakMs: scaleMs(85, speed),
      breakMs: scaleMs(75, speed),
      payoutMs: scaleMs(105, speed),
      dropMs: scaleMs(135, speed),
      settleMs: scaleMs(35, speed)
    };
  }

  return {
    scanMs: scaleMs(85, speed),
    prebreakMs: scaleMs(60, speed),
    breakMs: scaleMs(55, speed),
    payoutMs: scaleMs(75, speed),
    dropMs: scaleMs(100, speed),
    settleMs: scaleMs(25, speed)
  };
};

const eventIntensity = (result: SpinResult, cascadeIndex = 0) => {
  const winMultiple = result.bet > 0 ? result.totalWin / result.bet : 0;
  const cascadeBoost = Math.min(0.35, cascadeIndex * 0.08);
  const winBoost = Math.min(0.8, winMultiple / 18);
  return Number(Math.min(1.85, 0.75 + cascadeBoost + winBoost).toFixed(3));
};

const getCellPan = (cells: ClusterCell[] | undefined) => {
  if (!cells?.length) {
    return 0;
  }

  const avgCol = cells.reduce((acc, cell) => acc + cell.col, 0) / cells.length;
  return Number(Math.max(-1, Math.min(1, (avgCol - 2.5) / 2.5)).toFixed(3));
};

const flattenCells = (wins: CascadeWin[]) => wins.flatMap((win) => win.cells);

const hasMultiplierEvent = (result: SpinResult) =>
  result.appliedWinMultiplier > 1 ||
  result.cascades.some((cascade) =>
    cascade.modifierEvents.some(
      (event) =>
        event.type === "ouroboros" ||
        event.type === "panepoptis_ophthalmos" ||
        event.type === "seraphim_eye_multiplier" ||
        (event.type === "seraphim_eye" && event.multiplierBoost > 0)
    )
  );

const hasBonusTriggerEvent = (result: SpinResult) =>
  result.bonusTriggered ||
  result.cascades.some((cascade) =>
    cascade.modifierEvents.some((event) => event.type === "samsara_bonus_trigger")
  );

export const getPhaseForChoreographyEvent = (type: SpinChoreographyEventType): SpinPhase => {
  switch (type) {
    case "spin_start":
      return "SPIN_START";
    case "board_drop":
      return "BOARD_DROP";
    case "win_scan":
    case "symbol_prebreak":
    case "symbol_break":
    case "cascade_payout":
      return "WIN_CHECK";
    case "cascade_drop":
      return "CASCADE";
    case "multiplier_apply":
    case "bonus_trigger":
      return "MODIFIER_APPLY";
    case "round_summary":
    case "round_end":
      return "ROUND_END";
  }
};

export const buildSpinChoreography = (
  result: SpinResult,
  profile: SpinPresentationProfile,
  options: SpinChoreographyOptions
): SpinChoreographyRun => {
  const speed = profile.speed;
  const events: SpinChoreographyEvent[] = [];
  const pushEvent = (event: Omit<SpinChoreographyEvent, "phase">) => {
    events.push({
      ...event,
      phase: getPhaseForChoreographyEvent(event.type)
    });
  };

  pushEvent({
    type: "spin_start",
    atMs: 0,
    durationMs: scaleMs(150, speed),
    intensity: 0.9,
    sound: { event: "spin_charge", intensity: 0.95 }
  });

  if (result.cascades.length === 0) {
    pushEvent({
      type: "board_drop",
      atMs: scaleMs(150, speed),
      durationMs: scaleMs(360, speed),
      intensity: 0.65,
      sound: { event: "reel_drop", intensity: 0.65 }
    });

    const scanAtMs = scaleMs(620, speed);
    pushEvent({
      type: "win_scan",
      atMs: scanAtMs,
      durationMs: scaleMs(220, speed),
      intensity: 0.55,
      sound: { event: "win_scan", intensity: 0.5 }
    });
    pushEvent({
      type: "round_end",
      atMs: NO_WIN_TOTAL_MS[speed],
      durationMs: scaleMs(120, speed),
      intensity: 0.45,
      sound: { event: "loss", intensity: 0.7 }
    });

    return {
      runId: result.roundSummary.roundId,
      speed,
      summaryAtMs: NO_WIN_TOTAL_MS[speed],
      totalDurationMs: NO_WIN_TOTAL_MS[speed],
      events
    };
  }

  let cursor = scaleMs(160, speed);
  let runningWin = 0;

  result.cascades.forEach((cascade, cascadeIndex) => {
    const pacing = getCascadePacing(cascadeIndex, speed);
    const cells = flattenCells(cascade.wins);
    const intensity = eventIntensity(result, cascadeIndex);
    const pan = getCellPan(cells);

    pushEvent({
      type: "board_drop",
      atMs: cursor,
      durationMs: pacing.dropMs,
      cascadeIndex,
      wins: cascade.wins,
      cells,
      intensity,
      sound: { event: cascadeIndex === 0 ? "reel_drop" : "cascade_tick", intensity, pan }
    });
    cursor += pacing.dropMs;

    pushEvent({
      type: "win_scan",
      atMs: cursor,
      durationMs: pacing.scanMs,
      cascadeIndex,
      wins: cascade.wins,
      cells,
      intensity,
      sound: { event: "win_scan", intensity, pan }
    });
    cursor += pacing.scanMs;

    pushEvent({
      type: "symbol_prebreak",
      atMs: cursor,
      durationMs: pacing.prebreakMs,
      cascadeIndex,
      wins: cascade.wins,
      cells,
      intensity,
      sound: { event: "symbol_crack", intensity, pan }
    });
    cursor += pacing.prebreakMs;

    pushEvent({
      type: "symbol_break",
      atMs: cursor,
      durationMs: pacing.breakMs,
      cascadeIndex,
      wins: cascade.wins,
      cells,
      intensity,
      sound: { event: "symbol_break", intensity, pan }
    });
    cursor += pacing.breakMs;

    runningWin += cascade.stepWin;
    pushEvent({
      type: "cascade_payout",
      atMs: cursor,
      durationMs: pacing.payoutMs,
      cascadeIndex,
      wins: cascade.wins,
      cells,
      stepWin: cascade.stepWin,
      runningWin,
      intensity,
      sound: { event: "payout_tick", intensity, pan }
    });
    cursor += pacing.payoutMs;

    pushEvent({
      type: "cascade_drop",
      atMs: cursor,
      durationMs: pacing.dropMs,
      cascadeIndex,
      wins: cascade.wins,
      cells,
      stepWin: cascade.stepWin,
      runningWin,
      intensity,
      sound: { event: "reel_drop", intensity: Math.max(0.65, intensity - 0.25), pan }
    });
    cursor += pacing.dropMs + pacing.settleMs;
  });

  if (hasMultiplierEvent(result)) {
    pushEvent({
      type: "multiplier_apply",
      atMs: cursor,
      durationMs: scaleMs(240, speed),
      intensity: eventIntensity(result),
      sound: { event: "multiplier_apply", intensity: eventIntensity(result) }
    });
    cursor += scaleMs(260, speed);
  }

  if (hasBonusTriggerEvent(result)) {
    pushEvent({
      type: "bonus_trigger",
      atMs: cursor,
      durationMs: scaleMs(680, speed),
      intensity: 1.45,
      sound: { event: "bonus_open", intensity: 1.35 }
    });
    cursor += scaleMs(720, speed);
  }

  const winMultiple = result.bet > 0 ? result.totalWin / result.bet : 0;
  const summarySpeedScale = options.autoContinueNeverStop ? 0.84 : 1;
  const summaryHoldMs =
    winMultiple >= 25
      ? scaleMs(520 * summarySpeedScale, speed)
      : winMultiple >= 13
        ? scaleMs(420 * summarySpeedScale, speed)
        : winMultiple >= 5
          ? scaleMs(320 * summarySpeedScale, speed)
          : scaleMs(230 * summarySpeedScale, speed);
  const summaryAtMs = cursor + scaleMs(340, speed);

  pushEvent({
    type: "round_summary",
    atMs: summaryAtMs,
    durationMs: summaryHoldMs,
    intensity: eventIntensity(result),
    sound: {
      event:
        winMultiple >= 25
          ? "super_win"
          : winMultiple >= 13
            ? "huge_win"
            : winMultiple >= 5
              ? "big_win"
              : "round_win",
      intensity: eventIntensity(result)
    }
  });

  pushEvent({
    type: "round_end",
    atMs: summaryAtMs + summaryHoldMs,
    durationMs: scaleMs(80, speed),
    intensity: 0.65
  });

  return {
    runId: result.roundSummary.roundId,
    speed,
    summaryAtMs,
    totalDurationMs: summaryAtMs + summaryHoldMs,
    events
  };
};
