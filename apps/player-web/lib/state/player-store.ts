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
import type { GraphicsQuality } from "@/lib/assets/asset-manifest";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  initializeAnalyticsService,
  storeAnalyticsRoundForRuntime
} from "../../hooks/use-analytics-service";
import {
  clearGuestSession,
  ensureGuestSession,
  loadGuestSession,
  saveGuestSession
} from "@/lib/identity/guest-session";

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

export type PlayerAuthSource = "internal" | "external" | null;

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
  authSource: PlayerAuthSource;
  authenticatedUserId: string | null;
  hasHydrated: boolean;
  soundEnabled: boolean;
  graphicsQuality: GraphicsQuality;
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
  samsaraOwnerId: string | null;
  samsaraExpiryAt: number | null;
  gameStateSnapshot: GameState | null;
  roundsLog: RoundAnalyticsEntry[];
  walletTransactions: WalletTransaction[];
  paymentMethods: PaymentMethod[];
  simulatorWallet: Wallet;
  guestDisplayName: string;
  simulatorTotalDeposited: number;
  simulatorTotalWithdrawn: number;
  simulatorWelcomeClaimed: boolean;
  depositDraft: DepositDraft;
  withdrawalDraft: WithdrawalDraft;
  paymentMethodDraft: PaymentMethodDraft;
  toggleSound: () => void;
  setGraphicsQuality: (quality: GraphicsQuality) => void;
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
  setGuestDisplayName: (displayName: string) => void;
  setAuthSource: (source: PlayerAuthSource) => void;
  setAuthenticatedUserId: (userId: string | null) => void;
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

const saveGuestState = (state: {
  guestDisplayName: string;
  simulatorWallet: Wallet;
  simulatorTotalDeposited: number;
  simulatorTotalWithdrawn: number;
  simulatorWelcomeClaimed: boolean;
}) => {
  if (state.guestDisplayName.trim().length === 0) {
    return;
  }

  saveGuestSession({
    id: loadGuestSession()?.id ?? ensureGuestSession().id,
    displayName: state.guestDisplayName,
    walletBalance: state.simulatorWallet.balance,
    totalDeposited: state.simulatorTotalDeposited,
    totalWithdrawn: state.simulatorTotalWithdrawn,
    welcomeClaimed: state.simulatorWelcomeClaimed
  });
};

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

  const hasProgress =
    normalizedSnapshot.bonusMeter > 0 ||
    normalizedSnapshot.samsaraCollectedBets > 0 ||
    normalizedSnapshot.samsaraContributionLog.length > 0 ||
    Boolean(normalizedSnapshot.bonusState);

  if (!hasProgress || (parsedExpiry !== null && Date.now() <= parsedExpiry)) {
    return normalizedSnapshot;
  }

  return {
    ...normalizedSnapshot,
    bonusMeter: 0,
    samsaraCollectedBets: 0,
    samsaraContributionLog: []
  };
};

const hasSamsaraProgress = (snapshot: GameState | null | undefined) =>
  Boolean(
    snapshot &&
      (snapshot.bonusMeter > 0 ||
        snapshot.samsaraCollectedBets > 0 ||
        snapshot.samsaraContributionLog.length > 0 ||
        snapshot.bonusState)
  );

const resetSamsaraSnapshot = (snapshot: GameState): GameState => ({
  ...snapshot,
  bonusMeter: 0,
  samsaraCollectedBets: 0,
  samsaraContributionLog: []
});

const getCurrentSamsaraOwnerId = (
  state: Pick<PlayerUiState, "runtimeMode" | "authenticatedUserId"> | Partial<PlayerUiState>
) => {
  const guestSession = loadGuestSession();

  if (guestSession) {
    return `guest:${guestSession.id}`;
  }

  return state.authenticatedUserId ? `user:${state.authenticatedUserId}` : null;
};

const getSamsaraPersistence = (
  state: Pick<PlayerUiState, "runtimeMode" | "authenticatedUserId" | "samsaraOwnerId" | "samsaraExpiryAt">,
  snapshot: GameState,
  options: { allowNewExpiry: boolean }
) => {
  const ownerId = getCurrentSamsaraOwnerId(state);

  if (!hasSamsaraProgress(snapshot) || !ownerId) {
    return {
      gameStateSnapshot: !hasSamsaraProgress(snapshot) ? snapshot : resetSamsaraSnapshot(snapshot),
      samsaraOwnerId: null,
      samsaraExpiryAt: null
    };
  }

  const ownerMatches = state.samsaraOwnerId === ownerId;
  const validExistingExpiry =
    ownerMatches &&
    typeof state.samsaraExpiryAt === "number" &&
    Date.now() <= state.samsaraExpiryAt;

  if (validExistingExpiry) {
    return {
      gameStateSnapshot: snapshot,
      samsaraOwnerId: ownerId,
      samsaraExpiryAt: state.samsaraExpiryAt
    };
  }

  if (!options.allowNewExpiry) {
    return {
      gameStateSnapshot: resetSamsaraSnapshot(snapshot),
      samsaraOwnerId: null,
      samsaraExpiryAt: null
    };
  }

  return {
    gameStateSnapshot: snapshot,
    samsaraOwnerId: ownerId,
    samsaraExpiryAt: Date.now() + SAMSARA_PROGRESS_TTL_MS
  };
};

export const usePlayerUiStore = create<PlayerUiState>()(
  persist(
    (set, get) => ({
      runtimeMode: "authenticated",
      authSource: null,
      authenticatedUserId: null,
      soundEnabled: false,
      graphicsQuality: "high",
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
      samsaraOwnerId: null,
      samsaraExpiryAt: null,
      gameStateSnapshot: null,
      roundsLog: [],
      walletTransactions: [],
      paymentMethods: basePaymentMethods(),
      simulatorWallet: {
        balance: 0,
        currency: "EUR"
      },
      guestDisplayName: "",
      simulatorTotalDeposited: 0,
      simulatorTotalWithdrawn: 0,
      simulatorWelcomeClaimed: false,
      depositDraft: baseDepositDraft(),
      withdrawalDraft: baseWithdrawalDraft(),
      paymentMethodDraft: basePaymentMethodDraft(),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      setGraphicsQuality: (quality) =>
        set({ graphicsQuality: quality === "low" ? "low" : "high" }),
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

        set((state) => {
          const simulatorWallet =
            state.runtimeMode === "simulator"
              ? {
                  ...state.simulatorWallet,
                  balance: balanceAfter
                }
              : state.simulatorWallet;
          const simulatorWelcomeClaimed =
            state.runtimeMode === "simulator" ? true : state.simulatorWelcomeClaimed;

          if (state.runtimeMode === "simulator") {
            saveGuestState({
              ...state,
              simulatorWallet,
              simulatorWelcomeClaimed
            });
          }

          return {
            welcomeClaimed: true,
            welcomeOpen: false,
            wallet: {
              ...state.wallet,
              balance: balanceAfter
            },
            simulatorWallet,
            simulatorWelcomeClaimed,
            walletTransactions: appendTransaction(state.walletTransactions, transaction)
          };
        });

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

        set((state) => {
          const simulatorWallet =
            state.runtimeMode === "simulator"
              ? {
                  ...state.simulatorWallet,
                  balance: balanceAfter
                }
              : state.simulatorWallet;
          const simulatorTotalDeposited =
            state.runtimeMode === "simulator"
              ? Number((state.simulatorTotalDeposited + draft.amount).toFixed(2))
              : state.simulatorTotalDeposited;

          if (state.runtimeMode === "simulator") {
            saveGuestState({
              ...state,
              simulatorWallet,
              simulatorTotalDeposited
            });
          }

          return {
            wallet: {
              ...state.wallet,
              balance: balanceAfter
            },
            totalDeposited: Number((state.totalDeposited + draft.amount).toFixed(2)),
            simulatorWallet,
            simulatorTotalDeposited,
            depositDraft: {
              ...state.depositDraft,
              processing: false,
              successMessage: `Deposit successful +${draft.amount}`
            },
            walletTransactions: appendTransaction(state.walletTransactions, transaction)
          };
        });
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

        set((state) => {
          const simulatorWallet =
            state.runtimeMode === "simulator"
              ? {
                  ...state.simulatorWallet,
                  balance: balanceAfter
                }
              : state.simulatorWallet;
          const simulatorTotalWithdrawn =
            state.runtimeMode === "simulator"
              ? Number((state.simulatorTotalWithdrawn + withdrawalDraft.amount).toFixed(2))
              : state.simulatorTotalWithdrawn;

          if (state.runtimeMode === "simulator") {
            saveGuestState({
              ...state,
              simulatorWallet,
              simulatorTotalWithdrawn
            });
          }

          return {
            wallet: {
              ...state.wallet,
              balance: balanceAfter
            },
            totalWithdrawn: Number((state.totalWithdrawn + withdrawalDraft.amount).toFixed(2)),
            simulatorWallet,
            simulatorTotalWithdrawn,
            withdrawalDraft: {
              ...state.withdrawalDraft,
              processing: false,
              successMessage: "Withdrawal requested. Funds sent successfully (simulation)."
            },
            walletTransactions: appendTransaction(state.walletTransactions, transaction)
          };
        });

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
        set((state) => getSamsaraPersistence(state, gameState, { allowNewExpiry: true })),
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
            : winMultiple >= 25 ? "super_win"
            : winMultiple >= 13 ? "huge_win"
            : winMultiple >= 5 ? "big_win"
            : "win";

          const analyticsEntry: RoundAnalyticsEntry = {
            id: result.roundSummary.roundId,
            timestamp: Number.isFinite(Date.parse(result.roundSummary.timestamp))
              ? Date.parse(result.roundSummary.timestamp)
              : Date.now(),
            variant: "other",
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
            void storeAnalyticsRoundForRuntime(analyticsEntry, state.runtimeMode);
          }

          const simulatorWallet =
            state.runtimeMode === "simulator"
              ? {
                  ...state.simulatorWallet,
                  balance: result.balanceAfter
                }
              : state.simulatorWallet;

          if (state.runtimeMode === "simulator") {
            saveGuestState({
              ...state,
              simulatorWallet
            });
          }

          const samsaraPersistence = getSamsaraPersistence(state, result.nextState, {
            allowNewExpiry: true
          });

          return {
            wallet: {
              ...state.wallet,
              balance: result.balanceAfter
            },
            simulatorWallet,
            samsaraOwnerId: samsaraPersistence.samsaraOwnerId,
            samsaraExpiryAt: samsaraPersistence.samsaraExpiryAt,
            gameStateSnapshot: samsaraPersistence.gameStateSnapshot,
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
            state.samsaraExpiryAt
          );
          const samsaraPersistence = sanitizedGameState
            ? getSamsaraPersistence(state, sanitizedGameState, { allowNewExpiry: false })
            : { gameStateSnapshot: null, samsaraOwnerId: null, samsaraExpiryAt: null };

          return {
            wallet: {
              balance: snapshot.wallet.balance,
              currency: snapshot.wallet.currency
            },
            totalDeposited: snapshot.totalDeposited,
            totalWithdrawn: snapshot.totalWithdrawn,
            welcomeClaimed: snapshot.welcomeClaimed,
            welcomeOpen: !snapshot.welcomeClaimed,
            samsaraOwnerId: samsaraPersistence.samsaraOwnerId,
            samsaraExpiryAt: samsaraPersistence.samsaraExpiryAt,
            gameStateSnapshot: samsaraPersistence.gameStateSnapshot,
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
          const guestSession = ensureGuestSession();
          const guestWallet = {
            balance: guestSession.walletBalance,
            currency: "EUR" as const
          };

          return {
            runtimeMode: "simulator",
            authSource: null,
            guestDisplayName: guestSession.displayName,
            simulatorWallet: guestWallet,
            simulatorTotalDeposited: guestSession.totalDeposited,
            simulatorTotalWithdrawn: guestSession.totalWithdrawn,
            simulatorWelcomeClaimed: guestSession.welcomeClaimed,
            wallet: guestWallet,
            totalDeposited: guestSession.totalDeposited,
            totalWithdrawn: guestSession.totalWithdrawn,
            welcomeClaimed: guestSession.welcomeClaimed,
            welcomeOpen: !guestSession.welcomeClaimed,
            samsaraOwnerId: null,
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
      exitSimulatorMode: () => {
        clearGuestSession();
        set({
          runtimeMode: "authenticated",
          authSource: null,
          guestDisplayName: "",
          wallet: {
            balance: 0,
            currency: "EUR"
          },
          totalDeposited: 0,
          totalWithdrawn: 0,
          welcomeClaimed: false,
          welcomeOpen: true,
          samsaraOwnerId: null,
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
        });
      },
      setGuestDisplayName: (displayName) =>
        set((state) => {
          const trimmed = displayName.trim();
          if (!trimmed || state.runtimeMode !== "simulator") {
            return { guestDisplayName: state.guestDisplayName };
          }

          const nextState = {
            ...state,
            guestDisplayName: trimmed
          };
          saveGuestState(nextState);
          return { guestDisplayName: trimmed };
        }),
      resetSession: () =>
        set((state) => ({
          authSource: null,
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
          samsaraOwnerId: null,
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
        })),
      setAuthSource: (source) => set({ authSource: source }),
      setAuthenticatedUserId: (userId) =>
        set((state) => {
          const authenticatedUserId = userId?.trim() || null;
          const nextOwnerId = getCurrentSamsaraOwnerId({
            ...state,
            authenticatedUserId
          });

          if (
            state.samsaraOwnerId &&
            nextOwnerId &&
            state.samsaraOwnerId !== nextOwnerId &&
            state.gameStateSnapshot
          ) {
            return {
              authenticatedUserId,
              samsaraOwnerId: null,
              samsaraExpiryAt: null,
              gameStateSnapshot: resetSamsaraSnapshot(state.gameStateSnapshot)
            };
          }

          return { authenticatedUserId };
        })
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
        const guestSession = loadGuestSession();
        const runtimeMode = guestSession ? "simulator" : "authenticated";
        const paymentMethods =
          runtimeMode === "simulator"
            ? basePaymentMethods()
            : ensureDefaultPaymentMethod(persisted.paymentMethods);
        const fallbackMethodId = paymentMethods[0]?.id ?? defaultPaymentMethod.id;
        const withdrawalAmount = persisted.withdrawalDraft?.amount ?? baseWithdrawalDraft().amount;
        const persistedAuthenticatedUserId =
          typeof persisted.authenticatedUserId === "string" && persisted.authenticatedUserId.trim()
            ? persisted.authenticatedUserId.trim()
            : null;
        const currentSamsaraOwnerId =
          runtimeMode === "simulator"
            ? guestSession
              ? `guest:${guestSession.id}`
              : null
            : persistedAuthenticatedUserId
              ? `user:${persistedAuthenticatedUserId}`
              : null;
        const persistedSamsaraOwnerId =
          typeof persisted.samsaraOwnerId === "string" && persisted.samsaraOwnerId.trim()
            ? persisted.samsaraOwnerId.trim()
            : null;
        const samsaraOwnerMatches =
          Boolean(currentSamsaraOwnerId) && persistedSamsaraOwnerId === currentSamsaraOwnerId;
        const persistedSamsaraExpiryAt =
          samsaraOwnerMatches &&
          typeof persisted.samsaraExpiryAt === "number" &&
          Number.isFinite(persisted.samsaraExpiryAt)
            ? persisted.samsaraExpiryAt
            : null;
        const mergedGameStateSnapshot = sanitizeSamsaraSnapshot(
          persisted.gameStateSnapshot,
          persistedSamsaraExpiryAt
        );
        // Restore TTL only if it hasn't expired yet. TTL validity is independent of bonusMeter post-sanitization.
        const samsaraStillValid =
          samsaraOwnerMatches && persistedSamsaraExpiryAt && Date.now() <= persistedSamsaraExpiryAt;
        const mergedSamsaraExpiryAt = samsaraStillValid ? persistedSamsaraExpiryAt : null;
        const mergedSamsaraOwnerId = mergedSamsaraExpiryAt ? currentSamsaraOwnerId : null;
        const simulatorWallet = {
          balance: guestSession?.walletBalance ?? 0,
          currency: "EUR" as const
        };
        const simulatorWelcomeClaimed = guestSession?.welcomeClaimed ?? false;
        const simulatorTotalDeposited = guestSession?.totalDeposited ?? 0;
        const simulatorTotalWithdrawn = guestSession?.totalWithdrawn ?? 0;

        return {
          ...currentState,
          ...persisted,
          runtimeMode,
          graphicsQuality: persisted.graphicsQuality === "low" ? "low" : "high",
          authenticatedUserId: runtimeMode === "simulator" ? null : persistedAuthenticatedUserId,
          authSource: runtimeMode === "simulator" ? null : persisted.authSource ?? currentState.authSource,
          guestDisplayName: guestSession?.displayName ?? "",
          wallet: runtimeMode === "simulator" ? simulatorWallet : persisted.wallet ?? currentState.wallet,
          totalDeposited:
            runtimeMode === "simulator"
              ? simulatorTotalDeposited
              : persisted.totalDeposited ?? currentState.totalDeposited,
          totalWithdrawn:
            runtimeMode === "simulator"
              ? simulatorTotalWithdrawn
              : persisted.totalWithdrawn ?? currentState.totalWithdrawn,
          welcomeOpen:
            runtimeMode === "simulator"
              ? !simulatorWelcomeClaimed
              : persisted.welcomeOpen ?? currentState.welcomeOpen,
          welcomeClaimed:
            runtimeMode === "simulator"
              ? simulatorWelcomeClaimed
              : persisted.welcomeClaimed ?? currentState.welcomeClaimed,
          simulatorWallet,
          simulatorWelcomeClaimed,
          simulatorTotalDeposited,
          simulatorTotalWithdrawn,
          paymentMethods,
          samsaraOwnerId: mergedSamsaraOwnerId,
          samsaraExpiryAt: mergedSamsaraExpiryAt,
          gameStateSnapshot: mergedGameStateSnapshot,
          walletTransactions:
            runtimeMode === "simulator"
              ? []
              : Array.isArray(persisted.walletTransactions)
                ? persisted.walletTransactions
                : [],
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
        graphicsQuality: state.graphicsQuality,
        spinAnimationSpeed: state.spinAnimationSpeed,
        autoContinueNeverStop: state.autoContinueNeverStop,
        ...(state.runtimeMode === "simulator"
          ? {
              samsaraOwnerId: state.samsaraOwnerId,
              samsaraExpiryAt: state.samsaraExpiryAt,
              gameStateSnapshot: state.gameStateSnapshot
            }
          : {
              authenticatedUserId: state.authenticatedUserId,
              welcomeOpen: state.welcomeOpen,
              welcomeClaimed: state.welcomeClaimed,
              wallet: state.wallet,
              totalDeposited: state.totalDeposited,
              totalWithdrawn: state.totalWithdrawn,
              samsaraOwnerId: state.samsaraOwnerId,
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
