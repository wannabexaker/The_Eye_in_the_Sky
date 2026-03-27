/*
Purpose: stores UI, wallet, payment methods, and welcome state
Layer: frontend (player-web)
Uses: use-slot-machine.ts and wallet modal components
*/

import type {
  PaymentMethodDto,
  PlayerSnapshotDto,
  RoundAnalyticsEntry,
  RoundAnalyticsTier
} from "@eye/shared-types";
import type { GameState, SpinResult } from "@eye/game-engine";
import {
  DEFAULT_SPIN_ANIMATION_SPEED,
  type SpinAnimationSpeed
} from "@/lib/presentation/spin-state-machine";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { initializeAnalyticsService } from "../../hooks/use-analytics-service";

const PLAYER_STORE_PERSIST_KEY = "eye-in-the-sky-player-store";
const ANALYTICS_LOG_PERSIST_KEY = "eye-in-the-sky-rounds-log";
const SAMSARA_PROGRESS_TTL_MS = 60 * 60 * 1000;
const ANALYTICS_MAX_ROUNDS = 10000;

// Rounds log is persisted in a separate localStorage key to avoid serializing
// potentially thousands of entries on every spin, which blocks the main thread.
const loadRoundsLogFromStorage = (): RoundAnalyticsEntry[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(ANALYTICS_LOG_PERSIST_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as RoundAnalyticsEntry[]) : [];
  } catch {
    return [];
  }
};

let roundsLogFlushTimer: ReturnType<typeof setTimeout> | null = null;
const scheduleRoundsLogFlush = (entries: RoundAnalyticsEntry[]) => {
  if (roundsLogFlushTimer !== null) {
    clearTimeout(roundsLogFlushTimer);
  }
  roundsLogFlushTimer = setTimeout(() => {
    roundsLogFlushTimer = null;
    try {
      window.localStorage.setItem(ANALYTICS_LOG_PERSIST_KEY, JSON.stringify(entries));
    } catch {
      // localStorage full or unavailable — non-critical
    }
  }, 2000);
};

export type Wallet = {
  balance: number;
  currency: "EUR";
};

export type WalletTransaction = {
  id: string;
  timestamp: string;
  type: "deposit" | "withdrawal" | "bet" | "win" | "welcome_bonus";
  amount: number;
  balanceAfter: number;
  method?: string;
  label: string;
};

export type PaymentMethod = {
  id: string;
  type: "card" | "bank" | "crypto";
  label: string;
  last4?: string;
};

export type PlayerRuntimeMode = "authenticated" | "simulator";

type ModalKey =
  | "debugPanelOpen"
  | "settingsOpen"
  | "historyOpen"
  | "depositOpen"
  | "withdrawOpen"
  | "paymentMethodsOpen"
  | "walletHistoryOpen"
  | "analyticsOpen";

type DepositDraft = {
  amount: number;
  cardholder: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  processing: boolean;
  successMessage: string;
};

type WithdrawalDraft = {
  amount: number;
  methodId: string;
  processing: boolean;
  successMessage: string;
};

type PaymentMethodDraft = {
  type: "card" | "bank" | "crypto";
  label: string;
  last4: string;
};

type PlayerUiState = {
  runtimeMode: PlayerRuntimeMode;
  hasHydrated: boolean;
  soundEnabled: boolean;
  spinAnimationSpeed: SpinAnimationSpeed;
  autoContinueNeverStop: boolean;
  debugPanelOpen: boolean;
  settingsOpen: boolean;
  historyOpen: boolean;
  depositOpen: boolean;
  withdrawOpen: boolean;
  paymentMethodsOpen: boolean;
  walletHistoryOpen: boolean;
  analyticsOpen: boolean;
  welcomeOpen: boolean;
  welcomeClaimed: boolean;
  wallet: Wallet;
  totalDeposited: number;
  totalWithdrawn: number;
  samsaraExpiryAt: number | null;
  gameStateSnapshot: GameState | null;
  roundsLog: RoundAnalyticsEntry[];
  walletTransactions: WalletTransaction[];
  paymentMethods: PaymentMethod[];
  simulatorWallet: Wallet;
  simulatorTotalDeposited: number;
  simulatorTotalWithdrawn: number;
  simulatorWelcomeClaimed: boolean;
  depositDraft: DepositDraft;
  withdrawalDraft: WithdrawalDraft;
  paymentMethodDraft: PaymentMethodDraft;
  toggleSound: () => void;
  setSpinAnimationSpeed: (speed: SpinAnimationSpeed) => void;
  setAutoContinueNeverStop: (value: boolean) => void;
  toggleModal: (key: ModalKey) => void;
  setModal: (key: ModalKey, open: boolean) => void;
  toggleDebugPanel: () => void;
  toggleSettings: () => void;
  toggleHistory: () => void;
  closeAllWalletModals: () => void;
  claimWelcomeBonus: () => number;
  setDepositAmount: (amount: number) => void;
  setDepositField: (field: keyof Omit<DepositDraft, "amount" | "processing" | "successMessage">, value: string) => void;
  startDepositProcessing: () => void;
  completeDeposit: () => void;
  finishDepositProcessing: (successMessage: string) => void;
  setWithdrawalAmount: (amount: number) => void;
  setWithdrawalMethod: (methodId: string) => void;
  startWithdrawalProcessing: () => void;
  completeWithdrawal: () => { ok: boolean; reason?: string };
  finishWithdrawalProcessing: (successMessage: string) => void;
  setPaymentMethodDraftField: (field: keyof PaymentMethodDraft, value: string) => void;
  addPaymentMethod: () => void;
  removePaymentMethod: (methodId: string) => void;
  syncGameState: (gameState: GameState) => void;
  applyRoundResult: (result: SpinResult) => void;
  applyServerSnapshot: (snapshot: PlayerSnapshotDto) => void;
  enterSimulatorMode: () => void;
  exitSimulatorMode: () => void;
  resetSession: () => void;
};

const welcomeCredits = 500;
const defaultPaymentMethod: PaymentMethod = {
  id: "pm-default-card",
  type: "card",
  label: "Temple Visa",
  last4: "4242"
};

const createTransactionId = () =>
  `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const nowIso = () => new Date().toISOString();

const clearRoundsLogStorage = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(ANALYTICS_LOG_PERSIST_KEY);
  } catch {
    // localStorage unavailable — non-critical
  }
};

const baseDepositDraft = (): DepositDraft => ({
  amount: 100,
  cardholder: "Temple Initiate",
  cardNumber: "4242 4242 4242 4242",
  expiry: "12/30",
  cvv: "777",
  processing: false,
  successMessage: ""
});

const baseWithdrawalDraft = (): WithdrawalDraft => ({
  amount: 50,
  methodId: defaultPaymentMethod.id,
  processing: false,
  successMessage: ""
});

const basePaymentMethodDraft = (): PaymentMethodDraft => ({
  type: "card",
  label: "",
  last4: ""
});

const basePaymentMethods = (): PaymentMethod[] => [defaultPaymentMethod];

const ensureDefaultPaymentMethod = (
  paymentMethods: PaymentMethod[] | undefined
): PaymentMethod[] => {
  const normalized = paymentMethods ?? [];

  return normalized.some((entry) => entry.id === defaultPaymentMethod.id)
    ? normalized
    : [...normalized, defaultPaymentMethod];
};

const mapPaymentMethodDto = (method: PaymentMethodDto): PaymentMethod => ({
  id: method.id,
  type: method.type,
  label: method.label,
  last4: method.last4
});

const appendTransaction = (
  transactions: WalletTransaction[],
  entry: WalletTransaction
) => [entry, ...transactions].slice(0, 50);

const sanitizeSamsaraSnapshot = (
  snapshot: GameState | null | undefined,
  samsaraExpiryAt: number | null | undefined
): GameState | null => {
  if (!snapshot) {
    return null;
  }

  const parsedExpiry = typeof samsaraExpiryAt === "number" && Number.isFinite(samsaraExpiryAt)
    ? samsaraExpiryAt
    : null;

  const normalizedSnapshot: GameState = {
    ...snapshot,
    samsaraCollectedBets: Number.isFinite((snapshot as GameState).samsaraCollectedBets)
      ? (snapshot as GameState).samsaraCollectedBets
      : 0,
    samsaraContributionLog: Array.isArray((snapshot as GameState).samsaraContributionLog)
      ? (snapshot as GameState).samsaraContributionLog.filter(
          (entry) => typeof entry === "number" && Number.isFinite(entry) && entry > 0
        )
      : [],
    bonusState: snapshot.bonusState
      ? {
          ...snapshot.bonusState,
          betPerSpin:
            Number.isFinite(
              (snapshot.bonusState as unknown as { betPerSpin?: number }).betPerSpin
            )
              ? (snapshot.bonusState as unknown as { betPerSpin?: number }).betPerSpin ?? 0
              : 0,
          initialBonusBudget:
            Number.isFinite(
              (snapshot.bonusState as unknown as { initialBonusBudget?: number }).initialBonusBudget
            )
              ? (snapshot.bonusState as unknown as { initialBonusBudget?: number }).initialBonusBudget ?? 0
              : 0,
          remainingBonusBudget:
            Number.isFinite(
              (snapshot.bonusState as unknown as { remainingBonusBudget?: number }).remainingBonusBudget
            )
              ? (snapshot.bonusState as unknown as { remainingBonusBudget?: number }).remainingBonusBudget ?? 0
              : 0,
          preBonusBet:
            Number.isFinite(
              (snapshot.bonusState as unknown as { preBonusBet?: number }).preBonusBet
            )
              ? (snapshot.bonusState as unknown as { preBonusBet?: number }).preBonusBet ?? 0
              : 0
        }
      : null
  };

  if (parsedExpiry === null || Date.now() <= parsedExpiry) {
    return normalizedSnapshot;
  }

  return {
    ...normalizedSnapshot,
    bonusMeter: 0,
    samsaraCollectedBets: 0,
    samsaraContributionLog: []
  };
};

export const usePlayerUiStore = create<PlayerUiState>()(
  persist(
    (set, get) => ({
      runtimeMode: "authenticated",
      soundEnabled: false,
      hasHydrated: false,
      spinAnimationSpeed: DEFAULT_SPIN_ANIMATION_SPEED,
      autoContinueNeverStop: false,
      debugPanelOpen: false,
      settingsOpen: false,
      historyOpen: false,
      depositOpen: false,
      withdrawOpen: false,
      paymentMethodsOpen: false,
      walletHistoryOpen: false,
      analyticsOpen: false,
      welcomeOpen: true,
      welcomeClaimed: false,
      wallet: {
        balance: 0,
        currency: "EUR"
      },
      totalDeposited: 0,
      totalWithdrawn: 0,
      samsaraExpiryAt: null,
      gameStateSnapshot: null,
      roundsLog: [],
      walletTransactions: [],
      paymentMethods: basePaymentMethods(),
      simulatorWallet: {
        balance: 0,
        currency: "EUR"
      },
      simulatorTotalDeposited: 0,
      simulatorTotalWithdrawn: 0,
      simulatorWelcomeClaimed: false,
      depositDraft: baseDepositDraft(),
      withdrawalDraft: baseWithdrawalDraft(),
      paymentMethodDraft: basePaymentMethodDraft(),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      setSpinAnimationSpeed: (speed) => set({ spinAnimationSpeed: speed }),
      setAutoContinueNeverStop: (value) => set({ autoContinueNeverStop: value }),
      toggleModal: (key) => set((state) => ({ [key]: !state[key] }) as Pick<PlayerUiState, ModalKey>),
      setModal: (key, open) => set({ [key]: open } as Pick<PlayerUiState, ModalKey>),
      toggleDebugPanel: () =>
        set((state) => ({ debugPanelOpen: !state.debugPanelOpen })),
      toggleSettings: () =>
        set((state) => ({ settingsOpen: !state.settingsOpen })),
      toggleHistory: () =>
        set((state) => ({ historyOpen: !state.historyOpen })),
      closeAllWalletModals: () =>
        set({
          depositOpen: false,
          withdrawOpen: false,
          paymentMethodsOpen: false,
          walletHistoryOpen: false,
          depositDraft: baseDepositDraft(),
          withdrawalDraft: baseWithdrawalDraft(),
          paymentMethodDraft: basePaymentMethodDraft()
        }),
      claimWelcomeBonus: () => {
        if (get().welcomeClaimed) {
          set({ welcomeOpen: false });
          return get().wallet.balance;
        }

        const balanceAfter = Number((get().wallet.balance + welcomeCredits).toFixed(2));
        const transaction: WalletTransaction = {
          id: createTransactionId(),
          timestamp: nowIso(),
          type: "welcome_bonus",
          amount: welcomeCredits,
          balanceAfter,
          label: "Welcome Bonus"
        };

        set((state) => ({
          welcomeClaimed: true,
          welcomeOpen: false,
          wallet: {
            ...state.wallet,
            balance: balanceAfter
          },
          simulatorWallet:
            state.runtimeMode === "simulator"
              ? {
                  ...state.simulatorWallet,
                  balance: balanceAfter
                }
              : state.simulatorWallet,
          simulatorWelcomeClaimed:
            state.runtimeMode === "simulator" ? true : state.simulatorWelcomeClaimed,
          walletTransactions: appendTransaction(state.walletTransactions, transaction)
        }));

        return balanceAfter;
      },
      setDepositAmount: (amount) =>
        set((state) => ({
          depositDraft: {
            ...state.depositDraft,
            amount,
            successMessage: ""
          }
        })),
      setDepositField: (field, value) =>
        set((state) => ({
          depositDraft: {
            ...state.depositDraft,
            [field]: value,
            successMessage: ""
          }
        })),
      startDepositProcessing: () =>
        set((state) => ({
          depositDraft: {
            ...state.depositDraft,
            processing: true,
            successMessage: ""
          }
        })),
      completeDeposit: () => {
        const draft = get().depositDraft;
        const balanceAfter = Number((get().wallet.balance + draft.amount).toFixed(2));
        const transaction: WalletTransaction = {
          id: createTransactionId(),
          timestamp: nowIso(),
          type: "deposit",
          amount: draft.amount,
          balanceAfter,
          method: "Simulated Card",
          label: "Deposit"
        };

        set((state) => ({
          wallet: {
            ...state.wallet,
            balance: balanceAfter
          },
          totalDeposited: Number((state.totalDeposited + draft.amount).toFixed(2)),
          simulatorWallet:
            state.runtimeMode === "simulator"
              ? {
                  ...state.simulatorWallet,
                  balance: balanceAfter
                }
              : state.simulatorWallet,
          simulatorTotalDeposited:
            state.runtimeMode === "simulator"
              ? Number((state.simulatorTotalDeposited + draft.amount).toFixed(2))
              : state.simulatorTotalDeposited,
          depositDraft: {
            ...state.depositDraft,
            processing: false,
            successMessage: `Deposit successful +${draft.amount}`
          },
          walletTransactions: appendTransaction(state.walletTransactions, transaction)
        }));
      },
      finishDepositProcessing: (successMessage) =>
        set((state) => ({
          depositDraft: {
            ...state.depositDraft,
            processing: false,
            successMessage
          }
        })),
      setWithdrawalAmount: (amount) =>
        set((state) => ({
          withdrawalDraft: {
            ...state.withdrawalDraft,
            amount,
            successMessage: ""
          }
        })),
      setWithdrawalMethod: (methodId) =>
        set((state) => ({
          withdrawalDraft: {
            ...state.withdrawalDraft,
            methodId,
            successMessage: ""
          }
        })),
      startWithdrawalProcessing: () =>
        set((state) => ({
          withdrawalDraft: {
            ...state.withdrawalDraft,
            processing: true,
            successMessage: ""
          }
        })),
      completeWithdrawal: () => {
        const { withdrawalDraft, paymentMethods, wallet } = get();
        const method = paymentMethods.find((entry) => entry.id === withdrawalDraft.methodId);

        if (!method) {
          set((state) => ({
            withdrawalDraft: {
              ...state.withdrawalDraft,
              processing: false,
              successMessage: ""
            }
          }));
          return { ok: false, reason: "Add or select a payment method first." };
        }

        if (withdrawalDraft.amount <= 0 || withdrawalDraft.amount > wallet.balance) {
          set((state) => ({
            withdrawalDraft: {
              ...state.withdrawalDraft,
              processing: false,
              successMessage: ""
            }
          }));
          return { ok: false, reason: "Insufficient balance for withdrawal." };
        }

        const balanceAfter = Number((wallet.balance - withdrawalDraft.amount).toFixed(2));
        const transaction: WalletTransaction = {
          id: createTransactionId(),
          timestamp: nowIso(),
          type: "withdrawal",
          amount: withdrawalDraft.amount,
          balanceAfter,
          method: method.label,
          label: "Withdrawal"
        };

        set((state) => ({
          wallet: {
            ...state.wallet,
            balance: balanceAfter
          },
          totalWithdrawn: Number((state.totalWithdrawn + withdrawalDraft.amount).toFixed(2)),
          simulatorWallet:
            state.runtimeMode === "simulator"
              ? {
                  ...state.simulatorWallet,
                  balance: balanceAfter
                }
              : state.simulatorWallet,
          simulatorTotalWithdrawn:
            state.runtimeMode === "simulator"
              ? Number((state.simulatorTotalWithdrawn + withdrawalDraft.amount).toFixed(2))
              : state.simulatorTotalWithdrawn,
          withdrawalDraft: {
            ...state.withdrawalDraft,
            processing: false,
            successMessage: "Withdrawal requested. Funds sent successfully (simulation)."
          },
          walletTransactions: appendTransaction(state.walletTransactions, transaction)
        }));

        return { ok: true };
      },
      finishWithdrawalProcessing: (successMessage) =>
        set((state) => ({
          withdrawalDraft: {
            ...state.withdrawalDraft,
            processing: false,
            successMessage
          }
        })),
      setPaymentMethodDraftField: (field, value) =>
        set((state) => ({
          paymentMethodDraft: {
            ...state.paymentMethodDraft,
            [field]: value
          }
        })),
      addPaymentMethod: () => {
        const draft = get().paymentMethodDraft;
        const label = draft.label.trim() || `${draft.type.toUpperCase()} Method`;
        const last4 = draft.last4.trim() || undefined;
        const method: PaymentMethod = {
          id: `pm-${Date.now()}`,
          type: draft.type,
          label,
          last4
        };

        set((state) => ({
          paymentMethods: [method, ...state.paymentMethods],
          paymentMethodDraft: basePaymentMethodDraft(),
          withdrawalDraft: {
            ...state.withdrawalDraft,
            methodId: method.id
          }
        }));
      },
      removePaymentMethod: (methodId) => {
        if (methodId === defaultPaymentMethod.id) {
          return;
        }

        set((state) => ({
          paymentMethods: state.paymentMethods.filter((entry) => entry.id !== methodId),
          withdrawalDraft: {
            ...state.withdrawalDraft,
            methodId:
              state.withdrawalDraft.methodId === methodId
                ? defaultPaymentMethod.id
                : state.withdrawalDraft.methodId
          }
        }));
      },
      syncGameState: (gameState) =>
        set({
          gameStateSnapshot: gameState
        }),
      applyRoundResult: (result) =>
        set((state) => {
          const nextTransactions = [...state.walletTransactions];
          let balanceCursor = state.wallet.balance;

          if (result.debugMetadata.chargedBet > 0) {
            balanceCursor = Number((balanceCursor - result.debugMetadata.chargedBet).toFixed(2));
            nextTransactions.unshift({
              id: createTransactionId(),
              timestamp: result.roundSummary.timestamp,
              type: "bet",
              amount: result.debugMetadata.chargedBet,
              balanceAfter: balanceCursor,
              label: `Bet x${result.appliedWinMultiplier}`
            });
          }

          if (result.totalWin > 0) {
            balanceCursor = Number((balanceCursor + result.totalWin).toFixed(2));
            nextTransactions.unshift({
              id: createTransactionId(),
              timestamp: result.roundSummary.timestamp,
              type: "win",
              amount: result.totalWin,
              balanceAfter: balanceCursor,
              label: result.bonusTriggered ? "Win | Bonus Triggered" : "Win"
            });
          }

          const winMultiple = result.bet > 0 ? result.totalWin / result.bet : 0;
          const analyticsTier: RoundAnalyticsTier =
            result.totalWin <= 0 ? "loss"
            : winMultiple >= 14.9 ? "super_win"
            : winMultiple >= 8 ? "huge_win"
            : winMultiple >= 5 ? "big_win"
            : "win";

          const analyticsEntry: RoundAnalyticsEntry = {
            id: result.roundSummary.roundId,
            timestamp: Number.isFinite(Date.parse(result.roundSummary.timestamp))
              ? Date.parse(result.roundSummary.timestamp)
              : Date.now(),
            bet: result.bet,
            win: result.totalWin,
            net: Number((result.totalWin - result.debugMetadata.chargedBet).toFixed(2)),
            mode: result.mode,
            cascades: result.cascades.length,
            bonusTriggered: result.bonusTriggered,
            multiplier: result.appliedWinMultiplier,
            winMultiple: Number(winMultiple.toFixed(4)),
            tier: analyticsTier,
            balanceAfter: result.balanceAfter
          };

          const shouldTrackAnalytics = state.runtimeMode !== "simulator";
          const previousEntry = state.roundsLog[state.roundsLog.length - 1];
          const nextRoundsLog =
            shouldTrackAnalytics && previousEntry?.id !== analyticsEntry.id
              ? [...state.roundsLog, analyticsEntry]
              : state.roundsLog;
          const trimmedRoundsLog = shouldTrackAnalytics
            ? nextRoundsLog.slice(-ANALYTICS_MAX_ROUNDS)
            : [];

          // Write rounds log asynchronously in its own key — never blocks the spin
          if (shouldTrackAnalytics) {
            scheduleRoundsLogFlush(trimmedRoundsLog);
          }

          return {
            wallet: {
              ...state.wallet,
              balance: result.balanceAfter
            },
            simulatorWallet:
              state.runtimeMode === "simulator"
                ? {
                    ...state.simulatorWallet,
                    balance: result.balanceAfter
                  }
                : state.simulatorWallet,
            samsaraExpiryAt:
              state.runtimeMode === "simulator"
                ? null
                : result.nextState.bonusMeter > 0 || result.nextState.bonusState
                  ? Date.now() + SAMSARA_PROGRESS_TTL_MS
                  : null,
            gameStateSnapshot: state.runtimeMode === "simulator" ? null : result.nextState,
            walletTransactions: nextTransactions.slice(0, 50),
            roundsLog: trimmedRoundsLog
          };
        }),
      applyServerSnapshot: (snapshot) =>
        set((state) => {
          const serverPaymentMethods =
            Array.isArray(snapshot.paymentMethods) && snapshot.paymentMethods.length > 0
              ? snapshot.paymentMethods.map(mapPaymentMethodDto)
              : state.paymentMethods;
          const paymentMethods = ensureDefaultPaymentMethod([
            ...serverPaymentMethods,
            ...state.paymentMethods.filter(
              (method) => !serverPaymentMethods.some((serverMethod) => serverMethod.id === method.id)
            )
          ]);
          const fallbackMethodId = paymentMethods[0]?.id ?? defaultPaymentMethod.id;
          const sanitizedGameState = sanitizeSamsaraSnapshot(
            snapshot.gameStateSnapshot as GameState | null,
            snapshot.gameStateSnapshot &&
              typeof snapshot.gameStateSnapshot === "object" &&
              snapshot.gameStateSnapshot !== null &&
              (((snapshot.gameStateSnapshot as GameState).bonusMeter ?? 0) > 0 ||
                Boolean((snapshot.gameStateSnapshot as GameState).bonusState))
              ? Date.now() + SAMSARA_PROGRESS_TTL_MS
              : null
          );

          return {
            wallet: {
              balance: snapshot.wallet.balance,
              currency: snapshot.wallet.currency
            },
            totalDeposited: snapshot.totalDeposited,
            totalWithdrawn: snapshot.totalWithdrawn,
            welcomeClaimed: snapshot.welcomeClaimed,
            welcomeOpen: !snapshot.welcomeClaimed,
            samsaraExpiryAt:
              sanitizedGameState &&
              (sanitizedGameState.bonusMeter > 0 || Boolean(sanitizedGameState.bonusState))
                ? Date.now() + SAMSARA_PROGRESS_TTL_MS
                : null,
            gameStateSnapshot: sanitizedGameState,
            walletTransactions: snapshot.walletTransactions,
            paymentMethods,
            withdrawalDraft: {
              ...state.withdrawalDraft,
              methodId:
                paymentMethods.some((entry) => entry.id === state.withdrawalDraft.methodId)
                  ? state.withdrawalDraft.methodId
                  : fallbackMethodId,
              processing: false
            },
            depositDraft: {
              ...state.depositDraft,
              processing: false
            }
          };
        }),
      enterSimulatorMode: () =>
        set((state) => {
          clearRoundsLogStorage();
          initializeAnalyticsService([]);

          return {
            runtimeMode: "simulator",
            wallet: state.simulatorWallet,
            totalDeposited: state.simulatorTotalDeposited,
            totalWithdrawn: state.simulatorTotalWithdrawn,
            welcomeClaimed: state.simulatorWelcomeClaimed,
            welcomeOpen: !state.simulatorWelcomeClaimed,
            samsaraExpiryAt: null,
            gameStateSnapshot: null,
            roundsLog: [],
            walletTransactions: [],
            paymentMethods: basePaymentMethods(),
            depositDraft: baseDepositDraft(),
            withdrawalDraft: baseWithdrawalDraft(),
            paymentMethodDraft: basePaymentMethodDraft(),
            depositOpen: false,
            withdrawOpen: false,
            paymentMethodsOpen: false,
            walletHistoryOpen: false,
            analyticsOpen: false,
            historyOpen: false
          };
        }),
      exitSimulatorMode: () =>
        set({
          runtimeMode: "authenticated",
          wallet: {
            balance: 0,
            currency: "EUR"
          },
          totalDeposited: 0,
          totalWithdrawn: 0,
          welcomeClaimed: false,
          welcomeOpen: true,
          samsaraExpiryAt: null,
          gameStateSnapshot: null,
          roundsLog: [],
          walletTransactions: [],
          paymentMethods: basePaymentMethods(),
          depositDraft: baseDepositDraft(),
          withdrawalDraft: baseWithdrawalDraft(),
          paymentMethodDraft: basePaymentMethodDraft(),
          depositOpen: false,
          withdrawOpen: false,
          paymentMethodsOpen: false,
          walletHistoryOpen: false,
          analyticsOpen: false,
          historyOpen: false
        }),
      resetSession: () =>
        set((state) => ({
          wallet:
            state.runtimeMode === "simulator"
              ? state.simulatorWallet
              : {
                  balance: 0,
                  currency: "EUR"
                },
          totalDeposited:
            state.runtimeMode === "simulator" ? state.simulatorTotalDeposited : 0,
          totalWithdrawn:
            state.runtimeMode === "simulator" ? state.simulatorTotalWithdrawn : 0,
          samsaraExpiryAt: null,
          gameStateSnapshot: null,
          roundsLog: [],
          walletTransactions: [],
          paymentMethods: basePaymentMethods(),
          depositDraft: baseDepositDraft(),
          withdrawalDraft: baseWithdrawalDraft(),
          paymentMethodDraft: basePaymentMethodDraft(),
          welcomeOpen:
            state.runtimeMode === "simulator" ? !state.simulatorWelcomeClaimed : true,
          welcomeClaimed:
            state.runtimeMode === "simulator" ? state.simulatorWelcomeClaimed : false,
          depositOpen: false,
          withdrawOpen: false,
          paymentMethodsOpen: false,
          walletHistoryOpen: false,
          analyticsOpen: false
        }))
    }),
    {
      name: PLAYER_STORE_PERSIST_KEY,
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        const runtimeMode = state?.runtimeMode ?? "authenticated";
        const persistedRoundsLog =
          runtimeMode === "simulator" ? [] : loadRoundsLogFromStorage();
        const roundsLog =
          runtimeMode === "simulator"
            ? []
            : persistedRoundsLog.length > 0
              ? persistedRoundsLog
              : (state?.roundsLog ?? []);
        initializeAnalyticsService(roundsLog);
        usePlayerUiStore.setState({ hasHydrated: true, roundsLog });
      },
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<PlayerUiState>;
        const paymentMethods = ensureDefaultPaymentMethod(persisted.paymentMethods);
        const fallbackMethodId = paymentMethods[0]?.id ?? defaultPaymentMethod.id;
        const withdrawalAmount = persisted.withdrawalDraft?.amount ?? baseWithdrawalDraft().amount;
        const persistedSamsaraExpiryAt =
          typeof persisted.samsaraExpiryAt === "number" && Number.isFinite(persisted.samsaraExpiryAt)
            ? persisted.samsaraExpiryAt
            : null;
        const mergedGameStateSnapshot = sanitizeSamsaraSnapshot(
          persisted.gameStateSnapshot,
          persistedSamsaraExpiryAt
        );
        // Restore TTL only if it hasn't expired yet. TTL validity is independent of bonusMeter post-sanitization.
        const samsaraStillValid =
          persistedSamsaraExpiryAt && Date.now() <= persistedSamsaraExpiryAt;
        const mergedSamsaraExpiryAt = samsaraStillValid ? persistedSamsaraExpiryAt : null;
        const runtimeMode = persisted.runtimeMode === "simulator" ? "simulator" : "authenticated";
        const simulatorWallet = persisted.simulatorWallet ?? {
          balance: 0,
          currency: "EUR"
        };
        const simulatorWelcomeClaimed = persisted.simulatorWelcomeClaimed ?? false;
        const simulatorTotalDeposited = persisted.simulatorTotalDeposited ?? 0;
        const simulatorTotalWithdrawn = persisted.simulatorTotalWithdrawn ?? 0;

        return {
          ...currentState,
          ...persisted,
          runtimeMode,
          simulatorWallet,
          simulatorWelcomeClaimed,
          simulatorTotalDeposited,
          simulatorTotalWithdrawn,
          paymentMethods,
          samsaraExpiryAt: runtimeMode === "simulator" ? null : mergedSamsaraExpiryAt,
          gameStateSnapshot: runtimeMode === "simulator" ? null : mergedGameStateSnapshot,
          // roundsLog is loaded from its own localStorage key in onRehydrateStorage
          roundsLog:
            runtimeMode === "simulator"
              ? []
              : Array.isArray(persisted.roundsLog)
                ? persisted.roundsLog
                : [],
          withdrawalDraft: {
            amount: withdrawalAmount,
            methodId:
              persisted.withdrawalDraft?.methodId &&
              paymentMethods.some((entry) => entry.id === persisted.withdrawalDraft?.methodId)
                ? persisted.withdrawalDraft.methodId
                : fallbackMethodId,
            processing: false,
            successMessage: ""
          }
        };
      },
      partialize: (state) => ({
        runtimeMode: state.runtimeMode,
        soundEnabled: state.soundEnabled,
        spinAnimationSpeed: state.spinAnimationSpeed,
        autoContinueNeverStop: state.autoContinueNeverStop,
        simulatorWallet: state.simulatorWallet,
        simulatorTotalDeposited: state.simulatorTotalDeposited,
        simulatorTotalWithdrawn: state.simulatorTotalWithdrawn,
        simulatorWelcomeClaimed: state.simulatorWelcomeClaimed,
        ...(state.runtimeMode === "simulator"
          ? {
              welcomeOpen: state.welcomeOpen,
              welcomeClaimed: state.welcomeClaimed,
              wallet: state.wallet,
              totalDeposited: state.totalDeposited,
              totalWithdrawn: state.totalWithdrawn
            }
          : {
              welcomeOpen: state.welcomeOpen,
              welcomeClaimed: state.welcomeClaimed,
              wallet: state.wallet,
              totalDeposited: state.totalDeposited,
              totalWithdrawn: state.totalWithdrawn,
              samsaraExpiryAt: state.samsaraExpiryAt,
              walletTransactions: state.walletTransactions,
              paymentMethods: state.paymentMethods,
              gameStateSnapshot: state.gameStateSnapshot
            })
        // roundsLog is persisted separately in ANALYTICS_LOG_PERSIST_KEY
      })
    }
  )
);

let disposeCrossTabSync: (() => void) | null = null;

export const initPlayerStoreCrossTabSync = () => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  if (disposeCrossTabSync) {
    return disposeCrossTabSync;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.storageArea !== window.localStorage) {
      return;
    }

    if (event.key !== PLAYER_STORE_PERSIST_KEY || event.newValue === event.oldValue) {
      return;
    }

    void usePlayerUiStore.persist.rehydrate();
  };

  window.addEventListener("storage", handleStorage);

  disposeCrossTabSync = () => {
    window.removeEventListener("storage", handleStorage);
    disposeCrossTabSync = null;
  };

  return disposeCrossTabSync;
};
