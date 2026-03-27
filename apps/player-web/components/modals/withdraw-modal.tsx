/*
Purpose: simulates withdrawals against saved local payment methods
Layer: frontend (player-web)
Uses: player store wallet, payment methods, and withdrawal draft
*/

import { useEffect, useState } from "react";
import { usePlayerUiStore } from "@/lib/state/player-store";

const withdrawalAmounts = [20, 50, 100, 200, 500];

const parseAmount = (value: string) => {
  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const formatMoneyCompactEur = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);

type WithdrawModalProps = {
  onRequestWithdrawal: (amount: number, methodLabel?: string) => Promise<void>;
};

export function WithdrawModal({ onRequestWithdrawal }: WithdrawModalProps) {
  const {
    wallet,
    paymentMethods,
    withdrawalDraft,
    setWithdrawalAmount,
    setWithdrawalMethod,
    startWithdrawalProcessing,
    finishWithdrawalProcessing
  } = usePlayerUiStore();
  const [localMessage, setLocalMessage] = useState("");
  const [amountInput, setAmountInput] = useState(String(withdrawalDraft.amount));

  useEffect(() => {
    setAmountInput(String(withdrawalDraft.amount));
  }, [withdrawalDraft.amount]);

  const requestWithdrawal = () => {
    const parsedAmount = parseAmount(amountInput);

    if (parsedAmount === null || parsedAmount <= 0) {
      setLocalMessage("Enter a valid withdrawal amount.");
      return;
    }

    // commit typed amount before processing
    setWithdrawalAmount(parsedAmount);
    setLocalMessage("Processing withdrawal...");
    startWithdrawalProcessing();

    window.setTimeout(() => {
      const method = paymentMethods.find((entry) => entry.id === withdrawalDraft.methodId);
      void onRequestWithdrawal(parsedAmount, method?.label)
        .then(() => {
          finishWithdrawalProcessing(`Withdrawal requested ${parsedAmount}`);
          setLocalMessage(`Withdrawal requested: ${formatMoneyCompactEur(parsedAmount)}`);
        })
        .catch((error) => {
          finishWithdrawalProcessing("");
          setLocalMessage(error instanceof Error ? error.message : "Withdrawal failed.");
        });
    }, 900);
  };

  return (
    <div className="walletModalGrid">
      <section className="modalSection">
        <p className="eyebrow">Select Amount</p>
        <div className="chipRow chipRowInlineInput">
          {withdrawalAmounts.map((amount) => (
            <button
              className={`controlChip ${withdrawalDraft.amount === amount ? "is-active" : ""}`}
              key={amount}
              onClick={() => setWithdrawalAmount(amount)}
              type="button"
            >
              {formatMoneyCompactEur(amount)}
            </button>
          ))}

          <input
            aria-label="Withdrawal amount"
            className="chipInputInline"
            inputMode="decimal"
            onBlur={() => {
              const parsedAmount = parseAmount(amountInput);
              if (parsedAmount !== null && parsedAmount > 0) {
                setWithdrawalAmount(parsedAmount);
                setAmountInput(String(parsedAmount));
              }
            }}
            onChange={(event) => {
              setAmountInput(event.target.value);
              setLocalMessage("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                const parsedAmount = parseAmount(amountInput);
                if (parsedAmount !== null && parsedAmount > 0) {
                  setWithdrawalAmount(parsedAmount);
                  setAmountInput(String(parsedAmount));
                }
              }
            }}
            placeholder="Amount"
            type="text"
            value={amountInput}
          />
        </div>
      </section>

      <section className="modalSection formGrid singleFieldGrid">
        <label className="inputGroup">
          <span>Payment Method</span>
          <select
            onChange={(event) => setWithdrawalMethod(event.target.value)}
            value={withdrawalDraft.methodId}
          >
            <option value="">Select method</option>
            {paymentMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.label} ({method.type})
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="modalSection modalFooterRow">
        <div className="modalFeedback">
          <strong>
            {localMessage ||
              withdrawalDraft.successMessage ||
              `Balance ${formatMoneyCompactEur(wallet.balance)}`}
          </strong>
          <span>Simulation only. No external payout is sent.</span>
        </div>
        <button className="welcomeButton compactPrimary" onClick={requestWithdrawal} type="button">
          Request Withdrawal
        </button>
      </section>
    </div>
  );
}
