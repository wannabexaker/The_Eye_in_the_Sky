/*
Purpose: stores UI, wallet, payment methods, and welcome state
Layer: frontend (player-web)
Uses: use-slot-machine.ts and wallet modal components
*/

import type { GameState, SpinResult } from "@eye/game-engine";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

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

type ModalKey =
  | "debugPanelOpen"
  | "settingsOpen"
  | "historyOpen"
  | "depositOpen"
  | "withdrawOpen"
  | "paymentMethodsOpen"
  | "walletHistoryOpen";

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
  soundEnabled: boolean;
  debugPanelOpen: boolean;
  settingsOpen: boolean;
  historyOpen: boolean;
  depositOpen: boolean;
  withdrawOpen: boolean;
  paymentMethodsOpen: boolean;
  walletHistoryOpen: boolean;
  welcomeOpen: boolean;
  welcomeClaimed: boolean;
  wallet: Wallet;
  totalDeposited: number;
  totalWithdrawn: number;
  gameStateSnapshot: GameState | null;
  walletTransactions: WalletTransaction[];
  paymentMethods: PaymentMethod[];
  depositDraft: DepositDraft;
  withdrawalDraft: WithdrawalDraft;
  paymentMethodDraft: PaymentMethodDraft;
  toggleSound: () => void;
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
  setWithdrawalAmount: (amount: number) => void;
  setWithdrawalMethod: (methodId: string) => void;
  startWithdrawalProcessing: () => void;
  completeWithdrawal: () => { ok: boolean; reason?: string };
  setPaymentMethodDraftField: (field: keyof PaymentMethodDraft, value: string) => void;
  addPaymentMethod: () => void;
  removePaymentMethod: (methodId: string) => void;
  syncGameState: (gameState: GameState) => void;
  applyRoundResult: (result: SpinResult) => void;
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

const appendTransaction = (
  transactions: WalletTransaction[],
  entry: WalletTransaction
) => [entry, ...transactions].slice(0, 50);

export const usePlayerUiStore = create<PlayerUiState>()(
  persist(
    (set, get) => ({
      soundEnabled: false,
      debugPanelOpen: false,
      settingsOpen: false,
      historyOpen: false,
      depositOpen: false,
      withdrawOpen: false,
      paymentMethodsOpen: false,
      walletHistoryOpen: false,
      welcomeOpen: true,
      welcomeClaimed: false,
      wallet: {
        balance: 0,
        currency: "EUR"
      },
      totalDeposited: 0,
      totalWithdrawn: 0,
      gameStateSnapshot: null,
      walletTransactions: [],
      paymentMethods: basePaymentMethods(),
      depositDraft: baseDepositDraft(),
      withdrawalDraft: baseWithdrawalDraft(),
      paymentMethodDraft: basePaymentMethodDraft(),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
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
          depositDraft: {
            ...state.depositDraft,
            processing: false,
            successMessage: `Deposit successful +${draft.amount}`
          },
          walletTransactions: appendTransaction(state.walletTransactions, transaction)
        }));
      },
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
          withdrawalDraft: {
            ...state.withdrawalDraft,
            processing: false,
            successMessage: "Withdrawal requested. Funds sent successfully (simulation)."
          },
          walletTransactions: appendTransaction(state.walletTransactions, transaction)
        }));

        return { ok: true };
      },
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

          return {
            wallet: {
              ...state.wallet,
              balance: result.balanceAfter
            },
            gameStateSnapshot: result.nextState,
            walletTransactions: nextTransactions.slice(0, 50)
          };
        }),
      resetSession: () =>
        set({
          wallet: {
            balance: 0,
            currency: "EUR"
          },
          totalDeposited: 0,
          totalWithdrawn: 0,
          gameStateSnapshot: null,
          walletTransactions: [],
          paymentMethods: basePaymentMethods(),
          depositDraft: baseDepositDraft(),
          withdrawalDraft: baseWithdrawalDraft(),
          paymentMethodDraft: basePaymentMethodDraft(),
          welcomeOpen: true,
          welcomeClaimed: false,
          depositOpen: false,
          withdrawOpen: false,
          paymentMethodsOpen: false,
          walletHistoryOpen: false
        })
    }),
    {
      name: "eye-in-the-sky-player-store",
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<PlayerUiState>;
        const paymentMethods = ensureDefaultPaymentMethod(persisted.paymentMethods);
        const fallbackMethodId = paymentMethods[0]?.id ?? defaultPaymentMethod.id;
        const withdrawalAmount = persisted.withdrawalDraft?.amount ?? baseWithdrawalDraft().amount;

        return {
          ...currentState,
          ...persisted,
          paymentMethods,
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
        soundEnabled: state.soundEnabled,
        welcomeOpen: state.welcomeOpen,
        welcomeClaimed: state.welcomeClaimed,
        wallet: state.wallet,
        totalDeposited: state.totalDeposited,
        totalWithdrawn: state.totalWithdrawn,
        walletTransactions: state.walletTransactions,
        paymentMethods: state.paymentMethods,
        gameStateSnapshot: state.gameStateSnapshot
      })
    }
  )
);
