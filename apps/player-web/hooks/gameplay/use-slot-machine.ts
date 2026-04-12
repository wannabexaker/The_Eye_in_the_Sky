/*
Purpose: controls spin flow, wallet-aware betting, autospin, and win presentation
Layer: frontend (player-web)
Uses: game-engine resolveSpin, sound-manager.ts, and player-store.ts
*/

"use client";

import {
  initialGameState,
  resolveSpin,
  type GameConfig,
  type GameState,
  type SpinResult
} from "@eye/game-engine";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { soundManager } from "@/lib/audio/sound-manager";
import {
  SPIN_ANIMATION_SPEEDS,
  getSpinPresentationProfile,
  type SpinAnimationSpeed,
  type SpinPhase
} from "@/lib/presentation/spin-state-machine";
import type {
  BonusAnnouncementEntry,
  BonusSummaryEntry,
  WinPresentationEntry
} from "@/lib/presentation/win-presentation-types";
import { usePlayerUiStore } from "@/lib/state/player-store";

const MIN_BET = 0.1;
const DEFAULT_AUTOSPIN_COUNT = 10;
const QUICK_AUTOSPIN_OPTIONS = [10, 25, 50, 100];
const BET_STEP_OPTIONS = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
const MAX_PRESET_BET = BET_STEP_OPTIONS[BET_STEP_OPTIONS.length - 1];
const CUSTOM_BET_STEP = 1000;
const BONUS_ENTRY_CINEMATIC_DELAY_MS = 0;
const WIN_GLOW_START_MULTIPLE = 2;
const BIG_WIN_THRESHOLD = 5;
const HUGE_WIN_THRESHOLD = 13;
const SUPER_WIN_THRESHOLD = 25;
const ANALYTICS_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3200";
const ANALYTICS_INGEST_RETRY_DELAY_MS = 60_000;

let analyticsIngestBlockedUntil = 0;
let analyticsIngestWarnedOffline = false;

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

const deriveAnalyticsTier = (winMultiple: number, totalWin: number) => {
  if (totalWin <= 0) {
    return "loss" as const;
  }

  if (winMultiple >= SUPER_WIN_THRESHOLD) {
    return "super_win" as const;
  }

  if (winMultiple >= HUGE_WIN_THRESHOLD) {
    return "huge_win" as const;
  }

  if (winMultiple >= BIG_WIN_THRESHOLD) {
    return "big_win" as const;
  }

  return "win" as const;
};

const deriveAnalyticsVariant = (gameConfig: GameConfig): "2.0" | "simple" | "other" => {
  if (gameConfig.variantId === "constellation_simple") {
    return "simple";
  }

  if (gameConfig.version.includes("v2.0")) {
    return "2.0";
  }

  return "other";
};

const pushRoundAnalytics = async (result: SpinResult, gameConfig: GameConfig) => {
  if (typeof window === "undefined") {
    return;
  }

  if (Date.now() < analyticsIngestBlockedUntil) {
    return;
  }

  const winMultiple = result.bet > 0 ? result.totalWin / result.bet : 0;
  const payload = {
    entries: [
      {
        id: result.roundSummary.roundId,
        timestamp: Date.parse(result.roundSummary.timestamp) || Date.now(),
        variant: deriveAnalyticsVariant(gameConfig),
        bet: result.bet,
        win: result.totalWin,
        net: Number((result.totalWin - result.debugMetadata.chargedBet).toFixed(2)),
        mode: result.mode,
        cascades: result.cascades.length,
        bonusTriggered: result.bonusTriggered,
        multiplier: result.appliedWinMultiplier,
        winMultiple: Number(winMultiple.toFixed(4)),
        tier: deriveAnalyticsTier(winMultiple, result.totalWin),
        balanceAfter: result.balanceAfter
      }
    ]
  };

  try {
    const response = await fetch(`${ANALYTICS_API_BASE}/analytics/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Analytics ingest failed with status ${response.status}`);
    }

    analyticsIngestWarnedOffline = false;
  } catch {
    analyticsIngestBlockedUntil = Date.now() + ANALYTICS_INGEST_RETRY_DELAY_MS;
    if (!analyticsIngestWarnedOffline) {
      analyticsIngestWarnedOffline = true;
      console.warn(
        "Analytics ingest API is unreachable. Telemetry upload is paused for 60s; gameplay is unaffected."
      );
    }
  }
};

const roundCurrency = (value: number) => Number(value.toFixed(2));

const getRecommendedRiskThreshold = (balance: number) =>
  Math.max(0, Math.floor((balance / 10) * 100) / 100);

const parsePositiveNumber = (value: string) => {
  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? roundCurrency(parsed) : null;
};

const sanitizeBetInputValue = (value: string) => {
  const normalized = value.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const firstDotIndex = normalized.indexOf(".");
  const collapsedDots =
    firstDotIndex === -1
      ? normalized
      : `${normalized.slice(0, firstDotIndex + 1)}${normalized.slice(firstDotIndex + 1).replace(/\./g, "")}`;
  const [integerPart = "", decimalPart] = collapsedDots.split(".");
  const trimmedInteger = integerPart.replace(/^0+(?=\d)/, "");

  if (decimalPart !== undefined) {
    return `${trimmedInteger || "0"}.${decimalPart.slice(0, 2)}`;
  }

  return trimmedInteger;
};

const sanitizeAutospinInputValue = (value: string) => value.replace(/\D/g, "");

const parsePositiveInteger = (value: string) => {
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const isTypingTarget = (eventTarget: EventTarget | null) => {
  if (!(eventTarget instanceof HTMLElement)) {
    return false;
  }

  if (eventTarget.isContentEditable) {
    return true;
  }

  const tagName = eventTarget.tagName;
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
};

const getAutospinRequiredBalance = (
  count: number,
  bet: number,
  freeSpinsRemaining: number
) => roundCurrency(Math.max(0, count - freeSpinsRemaining) * bet);

const buildBetPresets = (availableBalance: number) =>
  BET_STEP_OPTIONS.filter((value) => value >= MIN_BET && value <= availableBalance);

const getNextLadderBet = (currentBet: number, availableBalance: number) => {
  const ladder = buildBetPresets(availableBalance);
  const next = ladder.find((value) => value > currentBet);
  return next ?? null;
};

const getPreviousLadderBet = (currentBet: number, availableBalance: number) => {
  const ladder = buildBetPresets(availableBalance);

  for (let index = ladder.length - 1; index >= 0; index -= 1) {
    if (ladder[index] < currentBet) {
      return ladder[index];
    }
  }

  return null;
};

const getNextBetValue = (currentBet: number, availableBalance: number) => {
  if (currentBet < MAX_PRESET_BET) {
    const ladderNext = getNextLadderBet(currentBet, Math.max(availableBalance, MAX_PRESET_BET));
    if (ladderNext !== null) {
      return ladderNext;
    }
  }

  return roundCurrency(currentBet + CUSTOM_BET_STEP);
};

const getPreviousBetValue = (currentBet: number, availableBalance: number) => {
  if (currentBet > MAX_PRESET_BET) {
    return roundCurrency(Math.max(MAX_PRESET_BET, currentBet - CUSTOM_BET_STEP));
  }

  return getPreviousLadderBet(currentBet, Math.max(availableBalance, MAX_PRESET_BET));
};

const hasBonusTrigger = (result: SpinResult) =>
  result.cascades.some((cascade) =>
    cascade.modifierEvents.some((event) => event.type === "samsara_bonus_trigger")
  );

const hasMultiplierEvent = (result: SpinResult) =>
  result.appliedWinMultiplier > 1 ||
  result.cascades.some((cascade) =>
    cascade.modifierEvents.some(
      (event) =>
        event.type === "ouroboros" ||
        event.type === "panepoptis_ophthalmos" ||
        (event.type === "seraphim_eye" && event.multiplierBoost > 0)
    )
  );

const isConstellationVariant = (gameConfig: GameConfig) =>
  gameConfig.variantId === "constellation_simple";

const getFreeSpinLabel = (gameConfig: GameConfig) =>
  isConstellationVariant(gameConfig) ? "Constellation Spins" : "Free Spins";

const getBonusSpinStartMessage = (result: SpinResult, gameConfig: GameConfig) => {
  if (isConstellationVariant(gameConfig)) {
    if (result.mode !== "bonus" || !result.bonusStateBefore) {
      return "Sky Opens answers with a Constellation free spin.";
    }

    return result.bonusStateBefore.freeSpinsRemaining === 1
      ? "Final Constellation spin underway."
      : "Sky Opens answers with another Constellation free spin.";
  }

  if (result.mode !== "bonus" || !result.bonusStateBefore) {
    return "Sky Opens answers with a free spin.";
  }

  const spinsBefore = Math.max(result.bonusStateBefore.freeSpinsRemaining, 0);
  const budgetBefore = roundCurrency(Math.max(0, result.bonusStateBefore.remainingBonusBudget));
  const betUsed = roundCurrency(Math.max(0, result.bet));
  const isLastBonusSpin = spinsBefore === 1;

  if (budgetBefore <= 0 || betUsed <= 0) {
    return "Samsara budget is exhausted. Spin resolves at 0.00 bet for board reveal only.";
  }

  if (isLastBonusSpin && betUsed === budgetBefore) {
    return `Final bonus spin: all remaining ${formatMoney(budgetBefore)} is committed.`;
  }

  return "Sky Opens answers with a free spin.";
};

const getBonusIdleMessage = (result: SpinResult, gameConfig: GameConfig) => {
  if (!result.nextState.bonusState) {
    return "Awaiting the next ritual.";
  }

  if (isConstellationVariant(gameConfig)) {
    return `${result.nextState.bonusState.freeSpinsRemaining} Constellation spins remain in Sky Opens.`;
  }

  const remainingSpins = result.nextState.bonusState.freeSpinsRemaining;
  const remainingBudget = roundCurrency(result.nextState.bonusState.remainingBonusBudget);

  if (remainingBudget <= 0) {
    return `${remainingSpins} bonus spins remain with 0.00 budget. 0.00 x 100 = 0.00.`;
  }

  return `${remainingSpins} bonus spins remain in Sky Opens.`;
};

const getRoundEndMessage = (result: SpinResult, gameConfig: GameConfig) => {
  if (
    isConstellationVariant(gameConfig) &&
    result.mode === "bonus" &&
    result.bet <= 0 &&
    result.totalWin <= 0
  ) {
    return "Round complete. No bonus stake remained for this reveal.";
  }

  if (result.mode === "bonus" && result.bet <= 0 && result.totalWin <= 0) {
    return "Round complete. No budget left: 0.00 x 100 = 0.00.";
  }

  return result.totalWin > 0
    ? `Round complete. ${formatMoney(result.totalWin)} claimed.`
    : "Round complete. The Eye remains watchful.";
};

const getCascadeDetailRows = (result: SpinResult, gameConfig: GameConfig) => {
  if (result.cascades.length <= 1) {
    return undefined;
  }

  let runningTotal = 0;

  return result.cascades.map((cascade, index) => {
    runningTotal += cascade.stepWin;
    return `${isConstellationVariant(gameConfig) ? "Tumble" : "Cascade"} ${index + 1}: +${formatMoney(cascade.stepWin)} | Total ${formatMoney(runningTotal)}`;
  });
};

const getFinalBonusTotal = (result: SpinResult) => {
  if (result.mode !== "bonus" || !result.bonusStateBefore || result.bonusStateAfter) {
    return null;
  }

  return Number((result.bonusStateBefore.totalBonusWin + result.totalWin).toFixed(2));
};

const buildBonusAnnouncement = (
  result: SpinResult,
  freeSpins: number,
  gameConfig: GameConfig
): BonusAnnouncementEntry => {
  const entryBudget = result.nextState.bonusState?.initialBonusBudget ?? result.totalWin;

  if (isConstellationVariant(gameConfig)) {
    return {
      variantTheme: "constellation",
      title: "BONUS TRIGGERED",
      heading: "Sky Opens",
      lead: "Samsara scatters broke the seal. Constellation free spins are ready.",
      freeSpins,
      entryWin: entryBudget,
      sourceLabel: "FREE-SPIN BANK",
      freeSpinsLabel: getFreeSpinLabel(gameConfig),
      modeLabel: "Mode",
      modeValue: "Constellation Active",
      continueLabel: "Enter Bonus"
    };
  }

  return {
    variantTheme: "default",
    title: "BONUS TRIGGERED",
    freeSpins,
    entryWin: entryBudget,
    sourceLabel: "BONUS ENTRY WIN",
    continueLabel: "Enter Bonus"
  };
};

const buildBonusSummary = (result: SpinResult, gameConfig: GameConfig): BonusSummaryEntry | null => {
  const finalBonusTotal = getFinalBonusTotal(result);

  if (finalBonusTotal === null) {
    return null;
  }

  if (isConstellationVariant(gameConfig)) {
    return {
      variantTheme: "constellation",
      title: "CONSTELLATION COMPLETE",
      subtitle: "SCATTER FREE SPINS FINISHED",
      totalWin: finalBonusTotal,
      totalWinLabel: "TOTAL CONSTELLATION WIN",
      continueLabel: "Return to Base Game"
    };
  }

  return {
    variantTheme: "default",
    title: "SKY OPENS BONUS COMPLETE",
    subtitle: "FREE SPINS FINISHED",
    totalWin: finalBonusTotal,
    continueLabel: "Return to Base Game"
  };
};

const buildWinPresentation = (
  result: SpinResult,
  autoContinueNeverStop: boolean,
  gameConfig: GameConfig,
  autoDismissTimings: {
    bigWinAutoDismissMs: number;
    winPresentationAutoDismissMs: number;
  }
): WinPresentationEntry | null => {
  if (buildBonusSummary(result, gameConfig)) {
    return null;
  }

  if (result.totalWin <= 0) {
    return null;
  }

  if (result.mode === "base" && result.bonusTriggered) {
    return null;
  }

  const winMultiple = result.bet > 0 ? result.totalWin / result.bet : 0;
  const glowLevel =
    winMultiple <= WIN_GLOW_START_MULTIPLE
      ? 0
      : Math.min(1, (winMultiple - WIN_GLOW_START_MULTIPLE) / (SUPER_WIN_THRESHOLD - WIN_GLOW_START_MULTIPLE));
  const bigWin = winMultiple >= BIG_WIN_THRESHOLD && winMultiple < HUGE_WIN_THRESHOLD;
  const hugeWin = winMultiple >= HUGE_WIN_THRESHOLD && winMultiple < SUPER_WIN_THRESHOLD;
  const superWin = winMultiple >= SUPER_WIN_THRESHOLD;
  const inBonus = result.mode === "bonus";
  const subtitleParts = [
    `x${winMultiple.toFixed(2)} total`,
    hasMultiplierEvent(result)
      ? isConstellationVariant(gameConfig)
        ? `Seraphim Eye settle x${result.appliedWinMultiplier}`
        : `x${result.appliedWinMultiplier} multiplier applied`
      : null,
    inBonus && result.bonusStateAfter
      ? `Bonus total ${formatMoney(result.bonusStateAfter.totalBonusWin)}`
      : null,
    result.bonusTriggered
      ? isConstellationVariant(gameConfig)
        ? `${gameConfig.bonusSpinsAwarded} scatter spins awarded`
        : `${gameConfig.bonusSpinsAwarded} free spins awarded`
      : null
  ].filter(Boolean);

  return {
    kind: superWin ? "super_win" : hugeWin ? "huge_win" : bigWin ? "big_win" : "round_win",
    title: superWin
      ? "SUPER WIN"
      : hugeWin
        ? "HUGE WIN"
        : bigWin
          ? "BIG WIN"
          : inBonus
            ? "FREE SPIN WIN"
            : result.cascades.length > 1
              ? isConstellationVariant(gameConfig)
                ? "TUMBLE TOTAL"
                : "CASCADE TOTAL"
              : isConstellationVariant(gameConfig)
                ? "BOARD WIN"
                : "WIN",
    amount: result.totalWin,
    winMultiple,
    glowLevel,
    subtitle: subtitleParts.join(" | ") || undefined,
    detailRows: getCascadeDetailRows(result, gameConfig),
    requireAcknowledgement:
      !autoContinueNeverStop &&
      (bigWin || hugeWin || superWin || result.cascades.length >= 3 || result.bonusTriggered),
    continueLabel: result.bonusTriggered ? "Enter Bonus" : "Continue",
    autoDismissMs:
      autoContinueNeverStop && (bigWin || hugeWin || superWin)
        ? autoDismissTimings.bigWinAutoDismissMs
        : bigWin || hugeWin || superWin
          ? undefined
          : autoDismissTimings.winPresentationAutoDismissMs
  };
};

export function useSlotMachine(gameConfig: GameConfig) {
  const {
    soundEnabled,
    spinAnimationSpeed,
    setSpinAnimationSpeed,
    autoContinueNeverStop,
    wallet,
    gameStateSnapshot,
    hasHydrated,
    applyRoundResult,
    syncGameState,
    resetSession
  } = usePlayerUiStore();
  const [gameState, setGameState] = useState<GameState>(() =>
    gameStateSnapshot ?? initialGameState(wallet.balance)
  );
  const [lastResult, setLastResult] = useState<SpinResult | null>(null);
  const [bet, setBet] = useState(MIN_BET);
  const [betInput, setBetInput] = useState(String(MIN_BET));
  const [betValidationMessage, setBetValidationMessage] = useState("");
  const [betValidationTooltip, setBetValidationTooltip] = useState("");
  const [betRiskMessage, setBetRiskMessage] = useState("");
  const [betRiskTooltip, setBetRiskTooltip] = useState("");
  const [winMultiplier, setWinMultiplier] = useState(1);
  const [history, setHistory] = useState<SpinResult[]>([]);
  const [requestedAutospinCount, setRequestedAutospinCount] = useState(DEFAULT_AUTOSPIN_COUNT);
  const [autospinCountInput, setAutospinCountInput] = useState(String(DEFAULT_AUTOSPIN_COUNT));
  const [autospinValidationMessage, setAutospinValidationMessage] = useState("");
  const [autoSpinRemaining, setAutoSpinRemaining] = useState(0);
  const [isAutoSpinning, setIsAutoSpinning] = useState(false);
  const [autospinStopRequested, setAutospinStopRequested] = useState(false);
  const [spinPhase, setSpinPhase] = useState<SpinPhase>("IDLE");
  const [phaseMessage, setPhaseMessage] = useState("Awaiting the next ritual.");
  const [spinPulseKey, setSpinPulseKey] = useState(0);
  const [bonusEntryPending, setBonusEntryPending] = useState(false);
  const [bonusAnnouncement, setBonusAnnouncement] = useState<BonusAnnouncementEntry | null>(null);
  const [bonusAnnouncementLocked, setBonusAnnouncementLocked] = useState(false);
  const [bonusSummary, setBonusSummary] = useState<BonusSummaryEntry | null>(null);
  const [bonusSummaryLocked, setBonusSummaryLocked] = useState(false);
  const [winPresentation, setWinPresentation] = useState<WinPresentationEntry | null>(null);
  const phaseTimersRef = useRef<number[]>([]);
  const presentationTimerRef = useRef<number | null>(null);
  const bonusAnnouncementLockTimerRef = useRef<number | null>(null);
  const bonusAnnouncementFastContinueTimerRef = useRef<number | null>(null);
  const bonusAnnouncementAutoContinueTimerRef = useRef<number | null>(null);
  const bonusAnnouncementShownAtRef = useRef<number | null>(null);
  const bonusSummaryLockTimerRef = useRef<number | null>(null);
  const bonusSummaryAutoContinueTimerRef = useRef<number | null>(null);
  const bonusSummaryShownAtRef = useRef<number | null>(null);
  const gameStateRef = useRef(gameState);
  const previousBonusStateRef = useRef<GameState["bonusState"]>(gameState.bonusState);
  const previousConfigVersionRef = useRef(gameConfig.version);
  const betRef = useRef(bet);
  const winMultiplierRef = useRef(winMultiplier);

  const availableBalance = roundCurrency(wallet.balance);
  const presentationProfile = useMemo(
    () => getSpinPresentationProfile(spinAnimationSpeed),
    [spinAnimationSpeed]
  );
  const presentationTimings = presentationProfile.timings;
  const rawMaxBet = availableBalance;
  const recommendedRiskThreshold = getRecommendedRiskThreshold(availableBalance);
  const activeBonusSpins = gameState.bonusState?.freeSpinsRemaining ?? 0;
  const autospinRequiredBalance = getAutospinRequiredBalance(
    requestedAutospinCount,
    bet,
    activeBonusSpins
  );
  const bonusModeActive = Boolean(gameState.bonusState);
  const areBetControlsLocked = isAutoSpinning || autospinStopRequested;

  useEffect(() => {
    if (previousConfigVersionRef.current === gameConfig.version) {
      return;
    }

    previousConfigVersionRef.current = gameConfig.version;
    phaseTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    phaseTimersRef.current = [];

    if (presentationTimerRef.current) {
      window.clearTimeout(presentationTimerRef.current);
      presentationTimerRef.current = null;
    }
    if (bonusAnnouncementLockTimerRef.current) {
      window.clearTimeout(bonusAnnouncementLockTimerRef.current);
      bonusAnnouncementLockTimerRef.current = null;
    }
    if (bonusAnnouncementFastContinueTimerRef.current) {
      window.clearTimeout(bonusAnnouncementFastContinueTimerRef.current);
      bonusAnnouncementFastContinueTimerRef.current = null;
    }
    if (bonusAnnouncementAutoContinueTimerRef.current) {
      window.clearTimeout(bonusAnnouncementAutoContinueTimerRef.current);
      bonusAnnouncementAutoContinueTimerRef.current = null;
    }
    if (bonusSummaryLockTimerRef.current) {
      window.clearTimeout(bonusSummaryLockTimerRef.current);
      bonusSummaryLockTimerRef.current = null;
    }
    if (bonusSummaryAutoContinueTimerRef.current) {
      window.clearTimeout(bonusSummaryAutoContinueTimerRef.current);
      bonusSummaryAutoContinueTimerRef.current = null;
    }

    const resetState = initialGameState(wallet.balance);
    gameStateRef.current = resetState;
    previousBonusStateRef.current = resetState.bonusState;
    betRef.current = MIN_BET;
    winMultiplierRef.current = gameConfig.winMultiplierOptions[0] ?? 1;

    setGameState(resetState);
    setLastResult(null);
    setHistory([]);
    setBet(MIN_BET);
    setBetInput(String(MIN_BET));
    setBetValidationMessage("");
    setBetValidationTooltip("");
    setBetRiskMessage("");
    setBetRiskTooltip("");
    setWinMultiplier(gameConfig.winMultiplierOptions[0] ?? 1);
    setRequestedAutospinCount(DEFAULT_AUTOSPIN_COUNT);
    setAutospinCountInput(String(DEFAULT_AUTOSPIN_COUNT));
    setAutospinValidationMessage("");
    setAutoSpinRemaining(0);
    setIsAutoSpinning(false);
    setAutospinStopRequested(false);
    setSpinPhase("IDLE");
    setPhaseMessage("Awaiting the next ritual.");
    setSpinPulseKey((current) => current + 1);
    setBonusEntryPending(false);
    setBonusAnnouncement(null);
    setBonusAnnouncementLocked(false);
    setBonusSummary(null);
    setBonusSummaryLocked(false);
    setWinPresentation(null);
  }, [gameConfig.version, gameConfig.winMultiplierOptions]);

  useEffect(() => {
    const previousBonusState = previousBonusStateRef.current;
    const currentBonusState = gameState.bonusState;

    if (!previousBonusState && currentBonusState) {
      const defaultBonusBet = roundCurrency(currentBonusState.betPerSpin);
      betRef.current = defaultBonusBet;
      setBet(defaultBonusBet);
      setBetInput(String(defaultBonusBet));
      setBetValidationMessage("");
      setBetValidationTooltip("");
    }

    if (previousBonusState && currentBonusState) {
      const nextBonusBet = roundCurrency(currentBonusState.betPerSpin);
      if (nextBonusBet !== betRef.current) {
        betRef.current = nextBonusBet;
        setBet(nextBonusBet);
        setBetInput(String(nextBonusBet));
        setBetValidationMessage("");
        setBetValidationTooltip("");
      }
    }

    if (previousBonusState && !currentBonusState) {
      const restoredBaseBet = roundCurrency(Math.max(MIN_BET, previousBonusState.preBonusBet));
      betRef.current = restoredBaseBet;
      setBet(restoredBaseBet);
      setBetInput(String(restoredBaseBet));
      setBetValidationMessage("");
      setBetValidationTooltip("");
    }

    previousBonusStateRef.current = currentBonusState;
  }, [gameState.bonusState]);

  const validateBetAmount = useCallback(
    (amount: number | null) => {
      if (amount === null) {
        return {
          message: "❌ Invalid",
          tooltip: "Please enter a valid bet amount."
        };
      }

      if (bonusModeActive && gameState.bonusState) {
        const remainingBudget = roundCurrency(gameState.bonusState.remainingBonusBudget);

        if (remainingBudget <= 0) {
          if (amount === 0) {
            return { message: "", tooltip: "" };
          }

          return {
            message: "❌ Budget exhausted",
            tooltip: "No Samsara bonus budget remains for the remaining free spins."
          };
        }

        if (amount <= 0) {
          return {
            message: "❌ Invalid bonus bet",
            tooltip: "Bonus bet must be greater than 0 while Samsara budget remains."
          };
        }

        if (amount > remainingBudget) {
          return {
            message: "❌ Exceeds bonus budget",
            tooltip: `Bonus bet cannot exceed remaining Samsara budget ${formatMoney(remainingBudget)}.`
          };
        }

        return { message: "", tooltip: "" };
      }

      if (amount < MIN_BET) {
        return {
          message: "❌ Min bet",
          tooltip: `Minimum bet is ${formatMoney(MIN_BET)}.`
        };
      }

      if (!bonusModeActive && rawMaxBet < MIN_BET) {
        return {
          message: "❌ Insufficient",
          tooltip: `Balance too low. Minimum required: ${formatMoney(MIN_BET)}.`
        };
      }

      if (!bonusModeActive && amount > availableBalance) {
        return {
          message: "❌ Exceeds balance",
          tooltip: `Your bet cannot exceed your balance of ${formatMoney(availableBalance)}.`
        };
      }

      return { message: "", tooltip: "" };
    },
    [availableBalance, bonusModeActive, gameState.bonusState, rawMaxBet]
  );

const validateAutospinCount = useCallback(
    (count: number | null) => {
      if (count === null) {
        return "Enter a valid autospin count.";
      }

      if (count < 1) {
        return "Autospin count must be at least 1.";
      }

      return "";
    },
    []
  );

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    setGameState((current) => {
      if (current.balance === wallet.balance) {
        return current;
      }

      const nextState = {
        ...current,
        balance: wallet.balance
      };

      gameStateRef.current = nextState;
      return nextState;
    });
  }, [wallet.balance]);

  useEffect(() => {
    if (!gameStateSnapshot) {
      return;
    }

    setGameState(gameStateSnapshot);
  }, [gameStateSnapshot]);

  // After rehydration, ensure persisted gameState is loaded into UI
  useEffect(() => {
    if (!hasHydrated || !gameStateSnapshot) {
      return;
    }

    setGameState(gameStateSnapshot);
  }, [hasHydrated, gameStateSnapshot]);

  useEffect(() => {
    betRef.current = bet;
  }, [bet]);

  useEffect(() => {
    winMultiplierRef.current = winMultiplier;
  }, [winMultiplier]);

  useEffect(() => {
    return () => {
      phaseTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      if (presentationTimerRef.current) {
        window.clearTimeout(presentationTimerRef.current);
      }
      if (bonusAnnouncementLockTimerRef.current) {
        window.clearTimeout(bonusAnnouncementLockTimerRef.current);
      }
      if (bonusAnnouncementFastContinueTimerRef.current) {
        window.clearTimeout(bonusAnnouncementFastContinueTimerRef.current);
      }
      if (bonusAnnouncementAutoContinueTimerRef.current) {
        window.clearTimeout(bonusAnnouncementAutoContinueTimerRef.current);
      }
      if (bonusSummaryLockTimerRef.current) {
        window.clearTimeout(bonusSummaryLockTimerRef.current);
      }
      if (bonusSummaryAutoContinueTimerRef.current) {
        window.clearTimeout(bonusSummaryAutoContinueTimerRef.current);
      }
    };
  }, []);

  // Sync gameState to the store only for changes that bypass applyRoundResult
  // (e.g. balance reconciliation, config reset). Normal spin results are already
  // persisted by applyRoundResult → gameStateSnapshot. Throttling to the next
  // microtask prevents redundant localStorage writes on every React re-render.
  const pendingSyncRef = useRef(false);
  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (pendingSyncRef.current) {
      return;
    }

    pendingSyncRef.current = true;
    queueMicrotask(() => {
      pendingSyncRef.current = false;
      syncGameState(gameStateRef.current);
    });
  }, [gameState, syncGameState, hasHydrated]);

  useEffect(() => {
    if (areBetControlsLocked || bonusModeActive) {
      return;
    }

    const validation = validateBetAmount(bet);
    if (!validation.message) {
      setBetValidationMessage("");
      setBetValidationTooltip("");
      return;
    }

    const fallbackBet = rawMaxBet >= MIN_BET ? Math.max(MIN_BET, Math.min(bet, rawMaxBet)) : bet;
    const normalizedFallbackBet = roundCurrency(fallbackBet);
    setBet(normalizedFallbackBet);
    setBetInput(String(normalizedFallbackBet));
    if (normalizedFallbackBet === bet) {
      setBetValidationMessage(validation.message);
      setBetValidationTooltip(validation.tooltip);
    } else {
      setBetValidationMessage("");
      setBetValidationTooltip("");
    }
  }, [areBetControlsLocked, bet, bonusModeActive, rawMaxBet, validateBetAmount]);

  useEffect(() => {
    if (bet <= recommendedRiskThreshold || recommendedRiskThreshold < MIN_BET) {
      setBetRiskMessage("");
      setBetRiskTooltip("");
      return;
    }

    const remainingBalance = Math.max(0, availableBalance - bet);
    setBetRiskMessage("⚠️ High-risk");
    setBetRiskTooltip(
      `High-risk bet: above the recommended ${formatMoney(recommendedRiskThreshold)} threshold. Remaining balance: ${formatMoney(remainingBalance)}.`
    );
  }, [bet, recommendedRiskThreshold, availableBalance]);

  useEffect(() => {
    if (!isAutoSpinning || spinPhase !== "IDLE") {
      return;
    }

    if (autospinStopRequested || autoSpinRemaining <= 0) {
      setIsAutoSpinning(false);
      setAutospinStopRequested(false);
      setAutoSpinRemaining(0);
      setAutospinValidationMessage("");
    }
  }, [autoSpinRemaining, autospinStopRequested, isAutoSpinning, spinPhase]);

  const clearTimers = useCallback(() => {
    phaseTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    phaseTimersRef.current = [];

    if (presentationTimerRef.current) {
      window.clearTimeout(presentationTimerRef.current);
      presentationTimerRef.current = null;
    }
  }, []);

  const canAffordSpin = bonusModeActive || availableBalance >= bet;
  const betValidationCheck = validateBetAmount(bet);
  const needsDepositPrompt = !bonusModeActive && availableBalance < MIN_BET;
  const canSpin =
    canAffordSpin &&
    !betValidationCheck.message &&
    spinPhase === "IDLE" &&
    !bonusEntryPending &&
    !bonusAnnouncement &&
    !bonusSummary &&
    !winPresentation;

  const applyBetValue = useCallback(
    (nextBet: number | null) => {
      if (areBetControlsLocked) {
        setBetValidationMessage((current) =>
          current === "Bet is locked while autospin is active. Press Stop first."
            ? current
            : "Bet is locked while autospin is active. Press Stop first."
        );
        setBetValidationTooltip((current) => (current === "" ? current : ""));
        return false;
      }

      const validation = validateBetAmount(nextBet);
      if (validation.message) {
        setBetValidationMessage((current) => (current === validation.message ? current : validation.message));
        setBetValidationTooltip((current) => (current === validation.tooltip ? current : validation.tooltip));
        return false;
      }

      const normalizedBet = roundCurrency(nextBet ?? MIN_BET);
      const normalizedBetInput = String(normalizedBet);

      if (normalizedBet !== betRef.current) {
        setBet(normalizedBet);
      }

      if (normalizedBetInput !== betInput) {
        setBetInput(normalizedBetInput);
      }

      setBetValidationMessage((current) => (current === "" ? current : ""));
      setBetValidationTooltip((current) => (current === "" ? current : ""));
      return true;
    },
    [areBetControlsLocked, betInput, validateBetAmount]
  );

  const incrementBetByStep = useCallback(() => {
    const parsedInputBet = parsePositiveNumber(betInput);
    const currentValue = parsedInputBet ?? bet;
    const nextBet = getNextBetValue(currentValue, rawMaxBet);
    if (!nextBet) {
      return false;
    }

    const maxAllowedBet = bonusModeActive && gameState.bonusState
      ? roundCurrency(gameState.bonusState.remainingBonusBudget)
      : rawMaxBet;
    const clampedNextBet = roundCurrency(Math.min(nextBet, maxAllowedBet));
    return applyBetValue(clampedNextBet);
  }, [applyBetValue, bet, betInput, bonusModeActive, gameState.bonusState, rawMaxBet]);

  const decrementBetByStep = useCallback(() => {
    const parsedInputBet = parsePositiveNumber(betInput);
    const currentValue = parsedInputBet ?? bet;
    const previousBet = getPreviousBetValue(currentValue, rawMaxBet);
    return previousBet ? applyBetValue(previousBet) : false;
  }, [applyBetValue, bet, betInput, rawMaxBet]);

  const applyManualBet = useCallback(() => {
    const parsed = parsePositiveNumber(betInput);
    return applyBetValue(parsed);
  }, [applyBetValue, betInput]);

  const clearAutospinValidation = useCallback(() => {
    setAutospinValidationMessage("");
  }, []);

  const applyAutospinCount = useCallback(
    (count: number) => {
      setAutospinCountInput(String(count));
      setRequestedAutospinCount(count);
      clearAutospinValidation();
    },
    [clearAutospinValidation]
  );

  const applyManualAutospinCount = useCallback(() => {
    if (autospinCountInput.trim() === "") {
      setAutospinValidationMessage("Enter a valid autospin count.");
      return null;
    }

    const parsed = parsePositiveInteger(autospinCountInput);
    const error = validateAutospinCount(parsed);

    if (error) {
      setAutospinValidationMessage(error);
      return null;
    }

    setRequestedAutospinCount(parsed ?? DEFAULT_AUTOSPIN_COUNT);
    setAutospinValidationMessage("");
    return parsed ?? DEFAULT_AUTOSPIN_COUNT;
  }, [autospinCountInput, validateAutospinCount]);

  const scheduleRoundFeedback = useCallback(
    (result: SpinResult) => {
      clearTimers();
      const bonusEntryTransition =
        result.mode === "base" &&
        !result.bonusStateBefore &&
        Boolean(result.nextState.bonusState);
      const shouldRunBonusEntryCue = hasBonusTrigger(result) || bonusEntryTransition;
      const bonusEntryRevealOffsetMs = bonusEntryTransition
        ? BONUS_ENTRY_CINEMATIC_DELAY_MS
        : 0;
      const bonusPhaseHoldMs = shouldRunBonusEntryCue
        ? presentationTimings.bonusTrigger
        : 0;

      setBonusEntryPending(bonusEntryTransition);

      // Extra time to keep phase schedule in sync with the board's per-cascade animation loop.
      // Board step = boardDrop + winHighlight + cascadeDrop + 110ms buffer.
      // For N cascades the board runs N × stepMs; the fixed schedule only covers 1 step,
      // so each additional cascade needs another stepMs added to all post-CASCADE timers.
      const cascadeStepMs =
        presentationTimings.boardDrop +
        presentationTimings.winHighlight +
        presentationTimings.cascadeDrop +
        110;
      const extraCascadeMs =
        result.cascades.length > 1 ? (result.cascades.length - 1) * cascadeStepMs : 0;
      const totalCascadeTimelineMs =
        presentationTimings.spinStart +
        presentationTimings.boardDrop +
        presentationTimings.winHighlight +
        presentationTimings.cascadeDrop +
        extraCascadeMs;
      const postBreakSafetyBufferMs = 40;
      const spinResultSettleBufferMs = 130;
      const roundOutcomeMessage = result.bonusTriggered
        ? "Sky Opens ignites."
        : result.totalWin > 0
          ? result.cascades.length > 1
            ? `Win landed with ${result.cascades.length} cascades.`
            : "Win landed."
          : "Missed this spin.";

      setSpinPulseKey((current) => current + 1);
      setSpinPhase("SPIN_START");
      soundManager.play("spin", soundEnabled);

      phaseTimersRef.current.push(
        window.setTimeout(() => {
          setSpinPhase("BOARD_DROP");
          soundManager.play("drop", soundEnabled);
        }, presentationTimings.spinStart)
      );

      phaseTimersRef.current.push(
        window.setTimeout(() => {
          setSpinPhase("WIN_CHECK");

          if (result.totalWin > 0) {
            const winMultiple = result.bet > 0 ? result.totalWin / result.bet : 0;
            const soundEvent =
              winMultiple >= SUPER_WIN_THRESHOLD
                ? "super_win"
                : winMultiple >= BIG_WIN_THRESHOLD
                  ? "big_win"
                  : "win";
            soundManager.play(soundEvent, soundEnabled);
          } else {
            soundManager.play("loss", soundEnabled);
          }
        }, presentationTimings.spinStart + presentationTimings.boardDrop + spinResultSettleBufferMs)
      );

      phaseTimersRef.current.push(
        window.setTimeout(() => {
          setSpinPhase("CASCADE");

          if (result.cascades.length > 0) {
            soundManager.play("cascade", soundEnabled);
          }
        },
          presentationTimings.spinStart +
            presentationTimings.boardDrop +
            spinResultSettleBufferMs +
            presentationTimings.winHighlight)
      );

      const totalCascadeTimelineWithSettleMs = totalCascadeTimelineMs + spinResultSettleBufferMs;

      phaseTimersRef.current.push(
        window.setTimeout(() => {
          setSpinPhase("MODIFIER_APPLY");

          if (hasMultiplierEvent(result)) {
            soundManager.play("multiplier", soundEnabled);
          }
        }, totalCascadeTimelineWithSettleMs)
      );

      if (shouldRunBonusEntryCue) {
        phaseTimersRef.current.push(
          window.setTimeout(() => {
            soundManager.play("bonus", soundEnabled);

            if (bonusEntryTransition && result.nextState.bonusState) {
              bonusAnnouncementShownAtRef.current = Date.now();
              setBonusAnnouncementLocked(true);
              setBonusAnnouncement(
                buildBonusAnnouncement(
                  result,
                  result.nextState.bonusState.freeSpinsRemaining,
                  gameConfig
                )
              );

              if (bonusAnnouncementLockTimerRef.current) {
                window.clearTimeout(bonusAnnouncementLockTimerRef.current);
              }
              if (bonusAnnouncementAutoContinueTimerRef.current) {
                window.clearTimeout(bonusAnnouncementAutoContinueTimerRef.current);
              }

              if (autoContinueNeverStop) {
                bonusAnnouncementAutoContinueTimerRef.current = window.setTimeout(() => {
                  bonusAnnouncementAutoContinueTimerRef.current = null;
                  bonusAnnouncementShownAtRef.current = null;
                  setBonusAnnouncementLocked(false);
                  setBonusEntryPending(false);
                  setBonusAnnouncement(null);
                }, presentationProfile.bonusNonstopAutoContinueMs);
              } else {
                bonusAnnouncementLockTimerRef.current = window.setTimeout(() => {
                  setBonusAnnouncementLocked(false);
                  bonusAnnouncementLockTimerRef.current = null;
                }, presentationProfile.bonusAnnouncementInputLockMs);
              }
            }
          }, totalCascadeTimelineWithSettleMs + presentationTimings.modifierFlash + bonusEntryRevealOffsetMs)
        );
      }

      phaseTimersRef.current.push(
        window.setTimeout(() => {
          setSpinPhase("ROUND_END");
          setPhaseMessage(roundOutcomeMessage);
        }, totalCascadeTimelineWithSettleMs + presentationTimings.modifierFlash + bonusPhaseHoldMs)
      );

      phaseTimersRef.current.push(
        window.setTimeout(() => {
          const summary = buildBonusSummary(result, gameConfig);
          const presentation = summary
            ? null
            : buildWinPresentation(result, autoContinueNeverStop, gameConfig, {
                bigWinAutoDismissMs: presentationProfile.bigWinAutoDismissMs,
                winPresentationAutoDismissMs: presentationProfile.winPresentationAutoDismissMs
              });

          if (summary) {
            bonusSummaryShownAtRef.current = Date.now();
            if (bonusSummaryLockTimerRef.current) {
              window.clearTimeout(bonusSummaryLockTimerRef.current);
            }
            if (bonusSummaryAutoContinueTimerRef.current) {
              window.clearTimeout(bonusSummaryAutoContinueTimerRef.current);
            }

            if (autoContinueNeverStop) {
              setBonusSummaryLocked(true);
              bonusSummaryAutoContinueTimerRef.current = window.setTimeout(() => {
                bonusSummaryAutoContinueTimerRef.current = null;
                bonusSummaryShownAtRef.current = null;
                setBonusSummaryLocked(false);
                setBonusSummary(null);
              }, presentationProfile.bonusNonstopAutoContinueMs);
            } else {
              setBonusSummaryLocked(false);
            }
          } else {
            setBonusSummaryLocked(false);
          }

          setBonusSummary(summary);
          setWinPresentation(presentation);

          if (presentation && !presentation.requireAcknowledgement && presentation.autoDismissMs) {
            presentationTimerRef.current = window.setTimeout(() => {
              setWinPresentation(null);
              presentationTimerRef.current = null;
            }, presentation.autoDismissMs);
          }

          setSpinPhase("IDLE");
        },
          totalCascadeTimelineWithSettleMs +
            presentationTimings.modifierFlash +
            bonusPhaseHoldMs +
            presentationTimings.roundEnd +
            postBreakSafetyBufferMs)
      );
    },
    [
      autoContinueNeverStop,
      clearTimers,
      gameConfig,
      presentationProfile,
      presentationTimings,
      soundEnabled
    ]
  );

  const runSpin = useCallback(() => {
    // Increment pulse key to restart animations immediately
    setSpinPulseKey((current) => current + 1);

    const currentState =
      gameStateRef.current.balance === availableBalance
        ? gameStateRef.current
        : {
            ...gameStateRef.current,
            balance: availableBalance
          };
    const currentBet = betRef.current;
    const currentWinMultiplier = winMultiplierRef.current;
    const canRun = Boolean(currentState.bonusState) || availableBalance >= currentBet;

    if (!canRun) {
      setIsAutoSpinning(false);
      setAutospinStopRequested(false);
      setAutoSpinRemaining(0);
      setAutospinValidationMessage("");
      return null;
    }

    soundManager.prime();
    gameStateRef.current = currentState;

    const result = resolveSpin({
      bet: currentBet,
      state: currentState,
      winMultiplier: currentWinMultiplier
    }, gameConfig);

    gameStateRef.current = result.nextState;
    setGameState(result.nextState);
    applyRoundResult(result);
    setLastResult(result);
    setHistory((current) => [result, ...current].slice(0, 10));
    scheduleRoundFeedback(result);
    void pushRoundAnalytics(result, gameConfig);
    return result;
  }, [applyRoundResult, availableBalance, gameConfig, scheduleRoundFeedback]);

  const spin = useCallback(() => {
    if (bonusEntryPending || bonusAnnouncement || bonusSummary) {
      return;
    }

    if (!applyManualBet()) {
      return;
    }

    setIsAutoSpinning(false);
    setAutospinStopRequested(false);
    setAutoSpinRemaining(0);
    setBetValidationMessage((current) => (current === "" ? current : ""));
    void runSpin();
  }, [applyManualBet, bonusAnnouncement, bonusEntryPending, bonusSummary, runSpin]);

  const startAutoSpin = useCallback(() => {
    if (!applyManualBet()) {
      return;
    }

    if (spinPhase !== "IDLE" || bonusEntryPending || bonusAnnouncement || bonusSummary || winPresentation) {
      if (bonusSummary) {
        setAutospinValidationMessage("Close the bonus summary before starting autospin.");
        return;
      }

      setAutospinValidationMessage("Wait for the current presentation to finish.");
      return;
    }

    const count = applyManualAutospinCount();
    if (!count) {
      return;
    }

    soundManager.prime();
    setRequestedAutospinCount(count);
    setAutoSpinRemaining(count);
    setIsAutoSpinning(true);
    setAutospinStopRequested(false);
    setAutospinValidationMessage("");
  }, [
    applyManualBet,
    applyManualAutospinCount,
    bonusAnnouncement,
    bonusEntryPending,
    bonusSummary,
    spinPhase,
    winPresentation
  ]);

  const startAutoSpinInfinite = useCallback(() => {
    if (!applyManualBet()) {
      return;
    }

    if (spinPhase !== "IDLE" || bonusEntryPending || bonusAnnouncement || bonusSummary || winPresentation) {
      if (bonusSummary) {
        setAutospinValidationMessage("Close the bonus summary before starting autospin.");
        return;
      }

      setAutospinValidationMessage("Wait for the current presentation to finish.");
      return;
    }

    soundManager.prime();
    setIsAutoSpinning(true);
    setAutospinStopRequested(false);
    setAutoSpinRemaining(Number.POSITIVE_INFINITY);
    setAutospinValidationMessage("Autospin running until stop or insufficient balance.");
  }, [applyManualBet, bonusAnnouncement, bonusEntryPending, bonusSummary, spinPhase, winPresentation]);

  const stopAutoSpin = useCallback(() => {
    if (!isAutoSpinning) {
      return;
    }

    if (spinPhase !== "IDLE") {
      setAutospinStopRequested(true);
      setAutospinValidationMessage("Stopping now. Current spin will finish, next auto spin is cancelled.");
      return;
    }

    setIsAutoSpinning(false);
    setAutospinStopRequested(false);
    setAutoSpinRemaining(0);
    setAutospinValidationMessage("");
  }, [isAutoSpinning, spinPhase]);

  useEffect(() => {
    if (
      !isAutoSpinning ||
      spinPhase !== "IDLE" ||
      bonusEntryPending ||
      bonusAnnouncement ||
      bonusSummary ||
      winPresentation
    ) {
      return;
    }

    if (autospinStopRequested) {
      setIsAutoSpinning(false);
      setAutospinStopRequested(false);
      setAutoSpinRemaining(0);
      setAutospinValidationMessage("");
      return;
    }

    if (autoSpinRemaining <= 0) {
      setIsAutoSpinning(false);
      setAutospinValidationMessage("");
      return;
    }

    const timer = window.setTimeout(() => {
      const result = runSpin();
      if (result) {
        setAutoSpinRemaining((current) => (Number.isFinite(current) ? current - 1 : current));
      }
    }, presentationProfile.autoSpinCadenceMs);

    return () => window.clearTimeout(timer);
  }, [
    autoSpinRemaining,
    autospinStopRequested,
    bonusAnnouncement,
    bonusEntryPending,
    bonusSummary,
    isAutoSpinning,
    presentationProfile.autoSpinCadenceMs,
    runSpin,
    spinPhase,
    winPresentation
  ]);

  useEffect(() => {
    if (bonusAnnouncement) {
      return;
    }

    if (bonusAnnouncementFastContinueTimerRef.current) {
      window.clearTimeout(bonusAnnouncementFastContinueTimerRef.current);
      bonusAnnouncementFastContinueTimerRef.current = null;
    }
    if (bonusAnnouncementAutoContinueTimerRef.current) {
      window.clearTimeout(bonusAnnouncementAutoContinueTimerRef.current);
      bonusAnnouncementAutoContinueTimerRef.current = null;
    }

    setBonusAnnouncementLocked(false);
    if (bonusAnnouncementLockTimerRef.current) {
      window.clearTimeout(bonusAnnouncementLockTimerRef.current);
      bonusAnnouncementLockTimerRef.current = null;
    }
  }, [bonusAnnouncement]);

  useEffect(() => {
    if (bonusSummary) {
      return;
    }

    if (bonusSummaryLockTimerRef.current) {
      window.clearTimeout(bonusSummaryLockTimerRef.current);
      bonusSummaryLockTimerRef.current = null;
    }
    if (bonusSummaryAutoContinueTimerRef.current) {
      window.clearTimeout(bonusSummaryAutoContinueTimerRef.current);
      bonusSummaryAutoContinueTimerRef.current = null;
    }

    setBonusSummaryLocked(false);
  }, [bonusSummary]);

  useEffect(() => {
    if (!autoContinueNeverStop || !winPresentation) {
      return;
    }

    // If nonstop is enabled while a blocking big/huge overlay is already open,
    // dismiss it automatically so autospin can continue without manual clicks.
    if (winPresentation.requireAcknowledgement) {
      const timer = window.setTimeout(() => {
        setWinPresentation(null);
      }, 180);

      return () => window.clearTimeout(timer);
    }
  }, [autoContinueNeverStop, winPresentation]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) {
        return;
      }

      const key = event.key.toLowerCase();
      const isFastContinueKey = key === "f";

      if (bonusAnnouncement) {
        if (!isFastContinueKey) {
          event.preventDefault();
        }
        return;
      }

      if (bonusAnnouncementLocked || bonusSummaryLocked) {
        event.preventDefault();
        return;
      }

      if (key === "s") {
        event.preventDefault();
        decrementBetByStep();
        return;
      }

      if (key === "w") {
        event.preventDefault();
        incrementBetByStep();
        return;
      }

      if (key === "a") {
        event.preventDefault();
        if (!isAutoSpinning) {
          startAutoSpinInfinite();
        }
        return;
      }

      if (key === "q") {
        event.preventDefault();
        stopAutoSpin();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bonusAnnouncement, bonusAnnouncementLocked, bonusSummaryLocked, decrementBetByStep, incrementBetByStep, isAutoSpinning, startAutoSpinInfinite, stopAutoSpin]);

  const dismissBonusAnnouncement = useCallback(() => {
    if (bonusAnnouncement) {
      if (bonusAnnouncementLocked) {
        return;
      }

      const shownAt = bonusAnnouncementShownAtRef.current;
      if (shownAt !== null && Date.now() - shownAt < presentationProfile.bonusAnnouncementMinVisibleMs) {
        return;
      }
    }

    if (bonusAnnouncementLockTimerRef.current) {
      window.clearTimeout(bonusAnnouncementLockTimerRef.current);
      bonusAnnouncementLockTimerRef.current = null;
    }
    if (bonusAnnouncementFastContinueTimerRef.current) {
      window.clearTimeout(bonusAnnouncementFastContinueTimerRef.current);
      bonusAnnouncementFastContinueTimerRef.current = null;
    }
    if (bonusAnnouncementAutoContinueTimerRef.current) {
      window.clearTimeout(bonusAnnouncementAutoContinueTimerRef.current);
      bonusAnnouncementAutoContinueTimerRef.current = null;
    }

    bonusAnnouncementShownAtRef.current = null;
    setBonusAnnouncementLocked(false);
    setBonusEntryPending(false);
    setBonusAnnouncement(null);
  }, [bonusAnnouncement, bonusAnnouncementLocked]);

  const requestBonusAnnouncementFastContinue = useCallback(() => {
    if (!bonusAnnouncement) {
      return;
    }

    const shownAt = bonusAnnouncementShownAtRef.current;
    const elapsedMs = shownAt === null ? presentationProfile.bonusAnnouncementMinVisibleMs : Date.now() - shownAt;
    const remainingMs = Math.max(0, presentationProfile.bonusAnnouncementMinVisibleMs - elapsedMs);

    if (remainingMs === 0 && !bonusAnnouncementLocked) {
      dismissBonusAnnouncement();
      return;
    }

    if (bonusAnnouncementFastContinueTimerRef.current) {
      return;
    }

    bonusAnnouncementFastContinueTimerRef.current = window.setTimeout(() => {
      bonusAnnouncementFastContinueTimerRef.current = null;
      dismissBonusAnnouncement();
    }, remainingMs);
  }, [bonusAnnouncement, bonusAnnouncementLocked, dismissBonusAnnouncement, presentationProfile.bonusAnnouncementMinVisibleMs]);

  const dismissBonusSummary = useCallback(() => {
    if (bonusSummary) {
      if (bonusSummaryLocked) {
        return;
      }

      const shownAt = bonusSummaryShownAtRef.current;
      if (shownAt !== null && Date.now() - shownAt < presentationProfile.bonusSummaryMinVisibleMs) {
        return;
      }
    }

    if (bonusSummaryLockTimerRef.current) {
      window.clearTimeout(bonusSummaryLockTimerRef.current);
      bonusSummaryLockTimerRef.current = null;
    }
    if (bonusSummaryAutoContinueTimerRef.current) {
      window.clearTimeout(bonusSummaryAutoContinueTimerRef.current);
      bonusSummaryAutoContinueTimerRef.current = null;
    }

    bonusSummaryShownAtRef.current = null;
    setBonusSummaryLocked(false);
    setBonusSummary(null);
  }, [bonusSummary, bonusSummaryLocked, presentationProfile.bonusSummaryMinVisibleMs]);

  const dismissWinPresentation = useCallback(() => {
    if (presentationTimerRef.current) {
      window.clearTimeout(presentationTimerRef.current);
      presentationTimerRef.current = null;
    }

    setWinPresentation(null);
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    if (bonusAnnouncementLockTimerRef.current) {
      window.clearTimeout(bonusAnnouncementLockTimerRef.current);
      bonusAnnouncementLockTimerRef.current = null;
    }
    if (bonusAnnouncementFastContinueTimerRef.current) {
      window.clearTimeout(bonusAnnouncementFastContinueTimerRef.current);
      bonusAnnouncementFastContinueTimerRef.current = null;
    }
    if (bonusAnnouncementAutoContinueTimerRef.current) {
      window.clearTimeout(bonusAnnouncementAutoContinueTimerRef.current);
      bonusAnnouncementAutoContinueTimerRef.current = null;
    }
    if (bonusSummaryLockTimerRef.current) {
      window.clearTimeout(bonusSummaryLockTimerRef.current);
      bonusSummaryLockTimerRef.current = null;
    }
    if (bonusSummaryAutoContinueTimerRef.current) {
      window.clearTimeout(bonusSummaryAutoContinueTimerRef.current);
      bonusSummaryAutoContinueTimerRef.current = null;
    }
    setIsAutoSpinning(false);
    setAutospinStopRequested(false);
    setAutoSpinRemaining(0);
    setRequestedAutospinCount(DEFAULT_AUTOSPIN_COUNT);
    setAutospinCountInput(String(DEFAULT_AUTOSPIN_COUNT));
    setAutospinValidationMessage("");
    setBonusEntryPending(false);
    setBonusAnnouncement(null);
    setBonusAnnouncementLocked(false);
    setBonusSummaryLocked(false);
    setBonusSummary(null);
    setWinPresentation(null);
    setSpinPhase("IDLE");
    setPhaseMessage("Awaiting the next ritual.");
    resetSession();
    setGameState(initialGameState());
    setLastResult(null);
    setHistory([]);
    setBet(MIN_BET);
    setBetInput(String(MIN_BET));
    setBetValidationMessage("");
    setBetRiskMessage("");
  }, [clearTimers, resetSession]);

  useEffect(() => {
    return () => {
      if (bonusAnnouncementLockTimerRef.current) {
        window.clearTimeout(bonusAnnouncementLockTimerRef.current);
      }
      if (bonusAnnouncementAutoContinueTimerRef.current) {
        window.clearTimeout(bonusAnnouncementAutoContinueTimerRef.current);
      }
      if (bonusSummaryLockTimerRef.current) {
        window.clearTimeout(bonusSummaryLockTimerRef.current);
      }
      if (bonusSummaryAutoContinueTimerRef.current) {
        window.clearTimeout(bonusSummaryAutoContinueTimerRef.current);
      }
    };
  }, []);

  const headerStats = useMemo(
    () => [
      { label: "Balance", value: formatMoney(wallet.balance) },
      { label: "Bet", value: formatMoney(bet) },
      { label: "Last Win", value: formatMoney(gameState.lastTotalWin) },
      { label: "Mode", value: gameState.bonusState ? "Sky Opens" : "Base Game" },
      {
        label: "Autospin",
        value: isAutoSpinning
          ? Number.isFinite(autoSpinRemaining)
            ? `${autoSpinRemaining} left`
            : "Infinite"
          : "Off"
      }
    ],
    [
      autoSpinRemaining,
      bet,
      gameState.bonusState,
      gameState.lastTotalWin,
      isAutoSpinning,
      wallet.balance
    ]
  );

  const displayPhaseMessage =
    needsDepositPrompt && spinPhase === "IDLE"
      ? `Balance too low. Minimum bet is ${formatMoney(MIN_BET)}. Deposit to continue.`
      : phaseMessage;
  const boardRules =
    gameConfig.variantId === "constellation_simple"
      ? [
          `${gameConfig.cols} columns x ${gameConfig.rows} rows`,
          `${gameConfig.clusterThreshold}+ matching symbols pay anywhere on the board`,
          `Pay bands: ${Object.keys(gameConfig.paytable[0]?.payouts ?? {})
            .map((value) => `${value}+`)
            .join(" / ")}`,
          "Samsara scatters pay separately and trigger Sky Opens on 4+",
          `Sky Opens uses ${gameConfig.bonusSpinsAwarded}+ free spins with additive Seraphim Eye multipliers`
        ]
      : [
          `${gameConfig.cols} columns x ${gameConfig.rows} rows`,
          `${gameConfig.clusterThreshold}+ adjacent symbols required for a win`,
          `Cascades resolve up to ${gameConfig.maxCascadeSteps} steps per spin`,
          "Winning symbols dissolve before cascade drops",
          `Bonus mode: ${gameConfig.bonusSpinsAwarded} free spins with persistent multiplier carry`
        ];

  return {
    bet,
    betInput,
    betOptions: buildBetPresets(rawMaxBet >= MIN_BET ? rawMaxBet : MIN_BET),
    betRiskMessage,
    betRiskTooltip,
    betValidationMessage,
    betValidationTooltip,
    minBet: MIN_BET,
    maxBet: rawMaxBet,
    requestedAutospinCount,
    autospinRemaining: autoSpinRemaining,
    autospinCountInput,
    autospinOptions: QUICK_AUTOSPIN_OPTIONS,
    autospinValidationMessage,
    autospinRequiredBalance,
    canSpin,
    canStartAutospin:
      !validateAutospinCount(requestedAutospinCount) &&
      !areBetControlsLocked &&
      !bonusEntryPending &&
      !bonusAnnouncement &&
      !bonusSummary &&
      !winPresentation &&
      spinPhase === "IDLE",
    currentBalance: availableBalance,
    areBetControlsLocked,
    isAutospinActive: isAutoSpinning,
    autospinStopRequested,
    autoContinueNeverStop,
    spinAnimationSpeed,
    spinSpeedOptions: SPIN_ANIMATION_SPEEDS,
    winMultiplier,
    winMultiplierOptions: gameConfig.winMultiplierOptions,
    spin,
    startAutoSpin,
    startAutoSpinInfinite,
    stopAutoSpin,
    reset,
    setBet: applyBetValue,
    incrementBetByStep,
    decrementBetByStep,
    setBetInput: (value: string) => {
      setBetInput(sanitizeBetInputValue(value));
      setBetValidationMessage("");
    },
    applyManualBet,
    setRequestedAutospinCount: applyAutospinCount,
    setAutospinCountInput: (value: string) => {
      setAutospinCountInput(sanitizeAutospinInputValue(value));
      setAutospinValidationMessage("");
    },
    applyManualAutospinCount,
    setWinMultiplier,
    setSpinAnimationSpeed,
    presentationTimings,
    floatingTextHoldMs: presentationProfile.floatingTextHoldMs,
    floatingTextFadeMs: presentationProfile.floatingTextFadeMs,
    gameState,
    lastResult,
    history,
    spinPhase,
    phaseMessage: displayPhaseMessage,
    needsDepositPrompt,
    spinPulseKey,
    bonusEntryPending,
    bonusAnnouncement,
    bonusAnnouncementLocked,
    dismissBonusAnnouncement,
    requestBonusAnnouncementFastContinue,
    bonusSummary,
    bonusSummaryLocked,
    dismissBonusSummary,
    winPresentation,
    dismissWinPresentation,
    headerStats,
    activeBonusSpins,
    samsaraCollectedBets: gameState.samsaraCollectedBets,
    samsaraContributionLog: gameState.samsaraContributionLog,
    meterRatio:
      gameConfig.bonusTriggerMode === "meter"
        ? gameState.bonusMeter / gameConfig.bonusMeterTarget
        : 0,
    boardRules
  };
}

