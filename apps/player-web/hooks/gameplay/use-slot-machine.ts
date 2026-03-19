/*
Purpose: controls spin flow, wallet-aware betting, autospin, and win presentation
Layer: frontend (player-web)
Uses: game-engine resolveSpin, sound-manager.ts, and player-store.ts
*/

"use client";

import {
  defaultGameConfig,
  initialGameState,
  resolveSpin,
  type GameState,
  type SpinResult
} from "@eye/game-engine";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const BONUS_ANNOUNCEMENT_AUTO_DISMISS_MS = 1350;
const BONUS_SUMMARY_AUTO_DISMISS_MS = 1800;
const BIG_WIN_AUTO_DISMISS_MS = 2200;

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

const roundCurrency = (value: number) => Number(value.toFixed(2));

const getRecommendedRiskThreshold = (balance: number) =>
  Math.max(0, Math.floor((balance / 10) * 100) / 100);

const parsePositiveNumber = (value: string) => {
  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? roundCurrency(parsed) : null;
};

const parsePositiveInteger = (value: string) => {
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
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
  const bigWin = winMultiple >= 5 && winMultiple < 10;
  const hugeWin = winMultiple >= 10;
  const inBonus = result.mode === "bonus";
  const subtitleParts = [
    hasMultiplierEvent(result) ? `x${result.appliedWinMultiplier} multiplier applied` : null,
    inBonus && result.bonusStateAfter
      ? `Bonus total ${formatMoney(result.bonusStateAfter.totalBonusWin)}`
      : null,
    result.bonusTriggered ? `${defaultGameConfig.bonusSpinsAwarded} free spins awarded` : null
  ].filter(Boolean);

  return {
    kind: hugeWin ? "huge_win" : bigWin ? "big_win" : "round_win",
    title: hugeWin
      ? "HUGE WIN"
      : bigWin
        ? "BIG WIN"
      : inBonus
        ? "FREE SPIN WIN"
        : result.cascades.length > 1
          ? "CASCADE TOTAL"
          : "WIN",
    amount: result.totalWin,
    subtitle: subtitleParts.join(" • ") || undefined,
    detailRows: getCascadeDetailRows(result),
    requireAcknowledgement:
      !autoContinueNeverStop &&
      (bigWin || hugeWin || result.cascades.length >= 3 || result.bonusTriggered),
    continueLabel: result.bonusTriggered ? "Enter Bonus" : "Continue",
    autoDismissMs:
      autoContinueNeverStop && (bigWin || hugeWin)
        ? BIG_WIN_AUTO_DISMISS_MS
        : bigWin || hugeWin
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
  const [betRiskMessage, setBetRiskMessage] = useState("");
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
  const areBetControlsLocked = isAutoSpinning || autospinStopRequested;
  const bonusModeActive = Boolean(gameState.bonusState);

  const validateBetAmount = useCallback(
    (amount: number | null) => {
      if (amount === null) {
        return "Enter a valid bet amount.";
      }

      if (amount < MIN_BET) {
        return `Minimum bet is ${formatMoney(MIN_BET)}.`;
      }

      if (!bonusModeActive && rawMaxBet < MIN_BET) {
        return `Balance too low. Minimum bet is ${formatMoney(MIN_BET)}.`;
      }

      if (!bonusModeActive && amount > availableBalance) {
        return "Bet cannot be higher than current balance.";
      }

      return "";
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

  useEffect(() => {
    syncGameState(gameState);
  }, [gameState, syncGameState]);

  useEffect(() => {
    if (areBetControlsLocked || bonusModeActive) {
      return;
    }

    const error = validateBetAmount(bet);
    if (!error) {
      setBetValidationMessage("");
      return;
    }

    const fallbackBet = rawMaxBet >= MIN_BET ? Math.max(MIN_BET, Math.min(bet, rawMaxBet)) : bet;
    const normalizedFallbackBet = roundCurrency(fallbackBet);
    setBet(normalizedFallbackBet);
    setBetInput(String(normalizedFallbackBet));
    setBetValidationMessage(normalizedFallbackBet === bet ? error : "");
  }, [areBetControlsLocked, bet, bonusModeActive, rawMaxBet, validateBetAmount]);

  useEffect(() => {
    if (bet <= recommendedRiskThreshold || recommendedRiskThreshold < MIN_BET) {
      setBetRiskMessage("");
      return;
    }

    setBetRiskMessage(
      `High-risk bet: above the recommended ${formatMoney(recommendedRiskThreshold)} threshold.`
    );
  }, [bet, recommendedRiskThreshold]);

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
  const betValidationError = validateBetAmount(bet);
  const needsDepositPrompt = !bonusModeActive && availableBalance < MIN_BET;
  const canSpin =
    canAffordSpin &&
    !betValidationError &&
    spinPhase === "IDLE" &&
    !bonusAnnouncement &&
    !bonusSummary &&
    !winPresentation;

  const applyBetValue = useCallback(
    (nextBet: number | null) => {
      if (areBetControlsLocked) {
        setBetValidationMessage("Bet is locked while autospin is active. Press Stop first.");
        return false;
      }

      const error = validateBetAmount(nextBet);
      if (error) {
        setBetValidationMessage(error);
        return false;
      }

      const normalizedBet = roundCurrency(nextBet ?? MIN_BET);
      setBet(normalizedBet);
      setBetInput(String(normalizedBet));
      setBetValidationMessage("");
      return true;
    },
    [areBetControlsLocked, validateBetAmount]
  );

  const incrementBetByStep = useCallback(() => {
    const nextBet = getNextLadderBet(bet, rawMaxBet);
    return nextBet ? applyBetValue(nextBet) : false;
  }, [applyBetValue, bet, rawMaxBet]);

  const decrementBetByStep = useCallback(() => {
    const previousBet = getPreviousLadderBet(bet, rawMaxBet);
    return previousBet ? applyBetValue(previousBet) : false;
  }, [applyBetValue, bet, rawMaxBet]);

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
            soundManager.play(
              result.totalWin >= result.bet * 5 ? "big_win" : "win",
              soundEnabled
            );
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
        }, PRESENTATION_TIMINGS.spinStart + PRESENTATION_TIMINGS.boardDrop + PRESENTATION_TIMINGS.winHighlight + PRESENTATION_TIMINGS.cascadeDrop)
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
          }, PRESENTATION_TIMINGS.spinStart + PRESENTATION_TIMINGS.boardDrop + PRESENTATION_TIMINGS.winHighlight + PRESENTATION_TIMINGS.cascadeDrop + PRESENTATION_TIMINGS.modifierFlash)
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
        }, PRESENTATION_TIMINGS.spinStart + PRESENTATION_TIMINGS.boardDrop + PRESENTATION_TIMINGS.winHighlight + PRESENTATION_TIMINGS.cascadeDrop + PRESENTATION_TIMINGS.modifierFlash + (hasBonusTrigger(result) ? PRESENTATION_TIMINGS.bonusTrigger : 0))
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
        }, PRESENTATION_TIMINGS.spinStart + PRESENTATION_TIMINGS.boardDrop + PRESENTATION_TIMINGS.winHighlight + PRESENTATION_TIMINGS.cascadeDrop + PRESENTATION_TIMINGS.modifierFlash + (hasBonusTrigger(result) ? PRESENTATION_TIMINGS.bonusTrigger : 0) + PRESENTATION_TIMINGS.roundEnd)
      );
    },
    [autoContinueNeverStop, clearTimers, soundEnabled]
  );

  const runSpin = useCallback(() => {
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
    });

    gameStateRef.current = result.nextState;
    setGameState(result.nextState);
    applyRoundResult(result);
    setLastResult(result);
    setHistory((current) => [result, ...current].slice(0, 10));
    scheduleRoundFeedback(result);
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

  const stopAutoSpin = useCallback(() => {
    if (!isAutoSpinning) {
      return;
    }

    if (spinPhase !== "IDLE") {
      setAutospinStopRequested(true);
      setAutospinValidationMessage("Stopping after the current spin completes.");
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
        setAutoSpinRemaining((current) => current - 1);
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
      { label: "Autospin", value: isAutoSpinning ? `${autoSpinRemaining} left` : "Off" }
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
    betValidationMessage,
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
    winMultiplierOptions: defaultGameConfig.winMultiplierOptions,
    spin,
    startAutoSpin,
    stopAutoSpin,
    reset,
    setBet: applyBetValue,
    incrementBetByStep,
    decrementBetByStep,
    setBetInput: (value: string) => {
      setBetInput(value);
      setBetValidationMessage("");
    },
    applyManualBet,
    setRequestedAutospinCount: applyAutospinCount,
    setAutospinCountInput: (value: string) => {
      setAutospinCountInput(value);
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
    meterRatio: gameState.bonusMeter / defaultGameConfig.bonusMeterTarget,
    boardRules: [
      `${defaultGameConfig.cols} columns x ${defaultGameConfig.rows} rows`,
      `${defaultGameConfig.clusterThreshold}+ adjacent symbols required for a win`,
      `Cascades resolve up to ${defaultGameConfig.maxCascadeSteps} steps per spin`,
      "Winning symbols dissolve before cascade drops",
      "Bonus mode: 8 free spins with persistent multiplier carry"
    ]
  };
}
