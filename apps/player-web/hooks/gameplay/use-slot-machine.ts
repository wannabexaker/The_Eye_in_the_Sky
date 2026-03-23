/*
Purpose: controls spin flow, wallet-aware betting, autospin, and win presentation
Layer: frontend (player-web)
Uses: game-engine resolveSpin, sound-manager.ts, and player-store.ts
*/

"use client";

import {
  initialGameState,
  resolveSpin,
  type GameState,
  type SpinResult
} from "@eye/game-engine";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { activeGameConfig } from "@/lib/game-config";
import { soundManager } from "@/lib/audio/sound-manager";
import {
  PRESENTATION_TIMINGS,
  WIN_PRESENTATION_AUTO_DISMISS_MS,
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
const BONUS_ANNOUNCEMENT_AUTO_DISMISS_MS = 1350;
const BONUS_SUMMARY_AUTO_DISMISS_MS = 1800;
const BIG_WIN_AUTO_DISMISS_MS = 2200;
const WIN_GLOW_START_MULTIPLE = 2;
const BIG_WIN_THRESHOLD = 5;
const HUGE_WIN_THRESHOLD = 8;
const SUPER_WIN_THRESHOLD = 14.9;
const ANALYTICS_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3200";

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

const pushRoundAnalytics = async (result: SpinResult) => {
  if (typeof window === "undefined") {
    return;
  }

  const winMultiple = result.bet > 0 ? result.totalWin / result.bet : 0;
  const payload = {
    entries: [
      {
        id: result.roundSummary.roundId,
        timestamp: Date.parse(result.roundSummary.timestamp) || Date.now(),
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

  await fetch(`${ANALYTICS_API_BASE}/analytics/ingest`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
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

const getCascadeDetailRows = (result: SpinResult) => {
  if (result.cascades.length <= 1) {
    return undefined;
  }

  let runningTotal = 0;

  return result.cascades.map((cascade, index) => {
    runningTotal += cascade.stepWin;
    return `Cascade ${index + 1}: +${formatMoney(cascade.stepWin)} | Total ${formatMoney(runningTotal)}`;
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
  freeSpins: number
): BonusAnnouncementEntry => ({
  title: "BONUS TRIGGERED",
  freeSpins,
  entryWin: result.totalWin,
  sourceLabel: "BONUS ENTRY WIN",
  continueLabel: "Enter Bonus"
});

const buildBonusSummary = (result: SpinResult): BonusSummaryEntry | null => {
  const finalBonusTotal = getFinalBonusTotal(result);

  if (finalBonusTotal === null) {
    return null;
  }

  return {
    title: "SKY OPENS BONUS COMPLETE",
    subtitle: "FREE SPINS FINISHED",
    totalWin: finalBonusTotal,
    continueLabel: "Return to Base Game"
  };
};

const buildWinPresentation = (
  result: SpinResult,
  autoContinueNeverStop: boolean
): WinPresentationEntry | null => {
  if (buildBonusSummary(result)) {
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
    hasMultiplierEvent(result) ? `x${result.appliedWinMultiplier} multiplier applied` : null,
    inBonus && result.bonusStateAfter
      ? `Bonus total ${formatMoney(result.bonusStateAfter.totalBonusWin)}`
      : null,
    result.bonusTriggered ? `${activeGameConfig.bonusSpinsAwarded} free spins awarded` : null
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
          ? "CASCADE TOTAL"
          : "WIN",
    amount: result.totalWin,
    winMultiple,
    glowLevel,
    subtitle: subtitleParts.join(" • ") || undefined,
    detailRows: getCascadeDetailRows(result),
    requireAcknowledgement:
      !autoContinueNeverStop &&
      (bigWin || hugeWin || superWin || result.cascades.length >= 3 || result.bonusTriggered),
    continueLabel: result.bonusTriggered ? "Enter Bonus" : "Continue",
    autoDismissMs:
      autoContinueNeverStop && (bigWin || hugeWin || superWin)
        ? BIG_WIN_AUTO_DISMISS_MS
        : bigWin || hugeWin || superWin
          ? undefined
          : WIN_PRESENTATION_AUTO_DISMISS_MS
  };
};

export function useSlotMachine() {
  const {
    soundEnabled,
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
  const [bonusAnnouncement, setBonusAnnouncement] = useState<BonusAnnouncementEntry | null>(null);
  const [bonusSummary, setBonusSummary] = useState<BonusSummaryEntry | null>(null);
  const [winPresentation, setWinPresentation] = useState<WinPresentationEntry | null>(null);
  const phaseTimersRef = useRef<number[]>([]);
  const presentationTimerRef = useRef<number | null>(null);
  const gameStateRef = useRef(gameState);
  const betRef = useRef(bet);
  const winMultiplierRef = useRef(winMultiplier);

  const availableBalance = roundCurrency(wallet.balance);
  const rawMaxBet = availableBalance;
  const recommendedRiskThreshold = getRecommendedRiskThreshold(availableBalance);
  const activeBonusSpins = gameState.bonusState?.freeSpinsRemaining ?? 0;
  const autospinRequiredBalance = getAutospinRequiredBalance(
    requestedAutospinCount,
    bet,
    activeBonusSpins
  );
  const bonusModeActive = Boolean(gameState.bonusState);
  const areBetControlsLocked = isAutoSpinning || autospinStopRequested || bonusModeActive;

  useEffect(() => {
    if (!gameState.bonusState) {
      return;
    }

    const fixedBonusBet = roundCurrency(gameState.bonusState.betPerSpin);
    if (fixedBonusBet !== betRef.current) {
      setBet(fixedBonusBet);
      setBetInput(String(fixedBonusBet));
      setBetValidationMessage("");
      setBetValidationTooltip("");
    }
  }, [gameState.bonusState]);

  const validateBetAmount = useCallback(
    (amount: number | null) => {
      if (amount === null) {
        return {
          message: "❌ Invalid",
          tooltip: "Please enter a valid bet amount."
        };
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
    [availableBalance, bonusModeActive, rawMaxBet]
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
    };
  }, []);

  // Only sync gameState back to the store AFTER hydration is complete.
  // Without this guard, the initialGameState() on mount overwrites the persisted Samsara meter.
  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    syncGameState(gameState);
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
    !bonusAnnouncement &&
    !bonusSummary &&
    !winPresentation;

  const applyBetValue = useCallback(
    (nextBet: number | null) => {
      if (areBetControlsLocked) {
        if (bonusModeActive) {
          const fixedBonusBet = gameStateRef.current.bonusState?.betPerSpin ?? betRef.current;
          setBetValidationMessage(`Bonus bet is fixed at ${formatMoney(fixedBonusBet)}.`);
          setBetValidationTooltip("Samsara-collected budget is distributed equally across all free spins.");
          return false;
        }

        setBetValidationMessage("Bet is locked while autospin is active. Press Stop first.");
        setBetValidationTooltip("");
        return false;
      }

      const validation = validateBetAmount(nextBet);
      if (validation.message) {
        setBetValidationMessage(validation.message);
        setBetValidationTooltip(validation.tooltip);
        return false;
      }

      const normalizedBet = roundCurrency(nextBet ?? MIN_BET);
      setBet(normalizedBet);
      setBetInput(String(normalizedBet));
      setBetValidationMessage("");
      setBetValidationTooltip("");
      return true;
    },
    [areBetControlsLocked, bonusModeActive, validateBetAmount]
  );

  const incrementBetByStep = useCallback(() => {
    const parsedInputBet = parsePositiveNumber(betInput);
    const currentValue = parsedInputBet ?? bet;
    const nextBet = getNextBetValue(currentValue, rawMaxBet);
    return nextBet ? applyBetValue(nextBet) : false;
  }, [applyBetValue, bet, betInput, rawMaxBet]);

  const decrementBetByStep = useCallback(() => {
    const parsedInputBet = parsePositiveNumber(betInput);
    const currentValue = parsedInputBet ?? bet;
    const previousBet = getPreviousBetValue(currentValue, rawMaxBet);
    return previousBet ? applyBetValue(previousBet) : false;
  }, [applyBetValue, bet, betInput, rawMaxBet]);

  const applyManualBet = useCallback(() => {
    if (bonusModeActive) {
      return true;
    }

    const parsed = parsePositiveNumber(betInput);
    return applyBetValue(parsed);
  }, [applyBetValue, betInput, bonusModeActive]);

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

      // Extra time to keep phase schedule in sync with the board's per-cascade animation loop.
      // Board step = boardDrop + winHighlight + cascadeDrop + 110ms buffer.
      // For N cascades the board runs N × stepMs; the fixed schedule only covers 1 step,
      // so each additional cascade needs another stepMs added to all post-CASCADE timers.
      const cascadeStepMs =
        PRESENTATION_TIMINGS.boardDrop +
        PRESENTATION_TIMINGS.winHighlight +
        PRESENTATION_TIMINGS.cascadeDrop +
        110;
      const extraCascadeMs =
        result.cascades.length > 1 ? (result.cascades.length - 1) * cascadeStepMs : 0;
      const totalCascadeTimelineMs =
        PRESENTATION_TIMINGS.spinStart +
        PRESENTATION_TIMINGS.boardDrop +
        PRESENTATION_TIMINGS.winHighlight +
        PRESENTATION_TIMINGS.cascadeDrop +
        extraCascadeMs;
      const postBreakSafetyBufferMs = 40;

      setSpinPulseKey((current) => current + 1);
      setSpinPhase("SPIN_START");
      setPhaseMessage(
        result.mode === "bonus"
          ? "Sky Opens answers with a free spin."
          : "The Eye begins its descent."
      );
      soundManager.play("spin", soundEnabled);

      phaseTimersRef.current.push(
        window.setTimeout(() => {
          setSpinPhase("BOARD_DROP");
          setPhaseMessage("Symbols descend through the forbidden temple.");
          soundManager.play("drop", soundEnabled);
        }, PRESENTATION_TIMINGS.spinStart)
      );

      phaseTimersRef.current.push(
        window.setTimeout(() => {
          setSpinPhase("WIN_CHECK");
          setPhaseMessage(
            result.cascades.length > 0
              ? `${result.cascades.length} cascade${result.cascades.length > 1 ? "s" : ""} detected.`
              : "The board settles without tribute."
          );

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
        }, PRESENTATION_TIMINGS.spinStart + PRESENTATION_TIMINGS.boardDrop)
      );

      phaseTimersRef.current.push(
        window.setTimeout(() => {
          setSpinPhase("CASCADE");
          setPhaseMessage(
            result.cascades.length > 0
              ? "Winning symbols turn to ash and new symbols fall into place."
              : "No cascade chain formed this round."
          );

          if (result.cascades.length > 0) {
            soundManager.play("cascade", soundEnabled);
          }
        }, PRESENTATION_TIMINGS.spinStart + PRESENTATION_TIMINGS.boardDrop + PRESENTATION_TIMINGS.winHighlight)
      );

      phaseTimersRef.current.push(
        window.setTimeout(() => {
          setSpinPhase("MODIFIER_APPLY");
          setPhaseMessage(
            hasMultiplierEvent(result)
              ? "Relics flare and multipliers illuminate the board."
              : "The chamber quiets as the round resolves."
          );

          if (hasMultiplierEvent(result)) {
            soundManager.play("multiplier", soundEnabled);
          }
        }, totalCascadeTimelineMs)
      );

      if (hasBonusTrigger(result)) {
        phaseTimersRef.current.push(
          window.setTimeout(() => {
            setPhaseMessage("Samsara fractures. Sky Opens.");
            soundManager.play("bonus", soundEnabled);

            if (result.mode === "base" && result.nextState.bonusState) {
              setBonusAnnouncement(
                buildBonusAnnouncement(
                  result,
                  result.nextState.bonusState.freeSpinsRemaining
                )
              );
            }
          }, totalCascadeTimelineMs + PRESENTATION_TIMINGS.modifierFlash)
        );
      }

      phaseTimersRef.current.push(
        window.setTimeout(() => {
          setSpinPhase("ROUND_END");
          setPhaseMessage(
            result.totalWin > 0
              ? `Round complete. ${formatMoney(result.totalWin)} claimed.`
              : "Round complete. The Eye remains watchful."
          );
        }, totalCascadeTimelineMs + PRESENTATION_TIMINGS.modifierFlash + (hasBonusTrigger(result) ? PRESENTATION_TIMINGS.bonusTrigger : 0))
      );

      phaseTimersRef.current.push(
        window.setTimeout(() => {
          const summary = buildBonusSummary(result);
          const presentation = summary ? null : buildWinPresentation(result, autoContinueNeverStop);

          setBonusSummary(summary);
          setWinPresentation(presentation);

          if (presentation && !presentation.requireAcknowledgement && presentation.autoDismissMs) {
            presentationTimerRef.current = window.setTimeout(() => {
              setWinPresentation(null);
              presentationTimerRef.current = null;
            }, presentation.autoDismissMs);
          }

          setSpinPhase("IDLE");
          setPhaseMessage(
            result.nextState.bonusState
              ? `${result.nextState.bonusState.freeSpinsRemaining} bonus spins remain in Sky Opens.`
              : "Awaiting the next ritual."
          );
        },
          totalCascadeTimelineMs +
            PRESENTATION_TIMINGS.modifierFlash +
            (hasBonusTrigger(result) ? PRESENTATION_TIMINGS.bonusTrigger : 0) +
            PRESENTATION_TIMINGS.roundEnd +
            postBreakSafetyBufferMs)
      );
    },
    [autoContinueNeverStop, clearTimers, soundEnabled]
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
    }, activeGameConfig);

    gameStateRef.current = result.nextState;
    setGameState(result.nextState);
    applyRoundResult(result);
    setLastResult(result);
    setHistory((current) => [result, ...current].slice(0, 10));
    scheduleRoundFeedback(result);
    void pushRoundAnalytics(result).catch(() => {
      // Analytics in Phase 1 are best-effort only and must never block gameplay.
    });
    return result;
  }, [applyRoundResult, availableBalance, scheduleRoundFeedback]);

  const spin = useCallback(() => {
    if (!applyManualBet()) {
      return;
    }

    setIsAutoSpinning(false);
    setAutospinStopRequested(false);
    setAutoSpinRemaining(0);
    setBetValidationMessage("");
    void runSpin();
  }, [applyManualBet, runSpin]);

  const startAutoSpin = useCallback(() => {
    if (!applyManualBet()) {
      return;
    }

    if (spinPhase !== "IDLE" || bonusAnnouncement || bonusSummary || winPresentation) {
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
    bonusSummary,
    spinPhase,
    winPresentation
  ]);

  const startAutoSpinInfinite = useCallback(() => {
    if (!applyManualBet()) {
      return;
    }

    if (spinPhase !== "IDLE" || bonusAnnouncement || bonusSummary || winPresentation) {
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
  }, [applyManualBet, bonusAnnouncement, bonusSummary, spinPhase, winPresentation]);

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
    }, 180);

    return () => window.clearTimeout(timer);
  }, [
    autoSpinRemaining,
    autospinStopRequested,
    bonusAnnouncement,
    bonusSummary,
    isAutoSpinning,
    runSpin,
    spinPhase,
    winPresentation
  ]);

  useEffect(() => {
    if (!autoContinueNeverStop || !bonusAnnouncement) {
      return;
    }

    const timer = window.setTimeout(() => {
      setBonusAnnouncement(null);
    }, BONUS_ANNOUNCEMENT_AUTO_DISMISS_MS);

    return () => window.clearTimeout(timer);
  }, [autoContinueNeverStop, bonusAnnouncement]);

  useEffect(() => {
    if (!autoContinueNeverStop || !bonusSummary) {
      return;
    }

    const timer = window.setTimeout(() => {
      setBonusSummary(null);
    }, BONUS_SUMMARY_AUTO_DISMISS_MS);

    return () => window.clearTimeout(timer);
  }, [autoContinueNeverStop, bonusSummary]);

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
  }, [decrementBetByStep, incrementBetByStep, isAutoSpinning, startAutoSpinInfinite, stopAutoSpin]);

  const dismissBonusAnnouncement = useCallback(() => {
    setBonusAnnouncement(null);
  }, []);

  const dismissBonusSummary = useCallback(() => {
    setBonusSummary(null);
  }, []);

  const dismissWinPresentation = useCallback(() => {
    if (presentationTimerRef.current) {
      window.clearTimeout(presentationTimerRef.current);
      presentationTimerRef.current = null;
    }

    setWinPresentation(null);
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setIsAutoSpinning(false);
    setAutospinStopRequested(false);
    setAutoSpinRemaining(0);
    setRequestedAutospinCount(DEFAULT_AUTOSPIN_COUNT);
    setAutospinCountInput(String(DEFAULT_AUTOSPIN_COUNT));
    setAutospinValidationMessage("");
    setBonusAnnouncement(null);
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
      !bonusAnnouncement &&
      !bonusSummary &&
      !winPresentation &&
      spinPhase === "IDLE",
    currentBalance: availableBalance,
    areBetControlsLocked,
    isAutospinActive: isAutoSpinning,
    autospinStopRequested,
    autoContinueNeverStop,
    winMultiplier,
    winMultiplierOptions: activeGameConfig.winMultiplierOptions,
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
    gameState,
    lastResult,
    history,
    spinPhase,
    phaseMessage: displayPhaseMessage,
    needsDepositPrompt,
    spinPulseKey,
    bonusAnnouncement,
    dismissBonusAnnouncement,
    bonusSummary,
    dismissBonusSummary,
    winPresentation,
    dismissWinPresentation,
    headerStats,
    activeBonusSpins,
    samsaraCollectedBets: gameState.samsaraCollectedBets,
    samsaraContributionLog: gameState.samsaraContributionLog,
    meterRatio: gameState.bonusMeter / activeGameConfig.bonusMeterTarget,
    boardRules: [
      `${activeGameConfig.cols} columns x ${activeGameConfig.rows} rows`,
      `${activeGameConfig.clusterThreshold}+ adjacent symbols required for a win`,
      `Cascades resolve up to ${activeGameConfig.maxCascadeSteps} steps per spin`,
      "Winning symbols dissolve before cascade drops",
      `Bonus mode: ${activeGameConfig.bonusSpinsAwarded} free spins with persistent multiplier carry`
    ]
  };
}
