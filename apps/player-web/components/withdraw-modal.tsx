/*
Purpose: simulates withdrawals against saved local payment methods
Layer: frontend (player-web)
Uses: player store wallet, payment methods, and withdrawal draft
*/

import { useEffect, useState } from "react";
import { usePlayerUiStore } from "../lib/player-store";

const withdrawalAmounts = [20, 50, 100, 200, 500];

const parseAmount = (value: string) => {
  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : null;
};

export function WithdrawModal() {
  const {
    wallet,
    paymentMethods,
    withdrawalDraft,
    setWithdrawalAmount,
    setWithdrawalMethod,
    startWithdrawalProcessing,
    completeWithdrawal
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
      const result = completeWithdrawal();
      setLocalMessage(
        result.ok
          ? "Withdrawal requested. Funds sent successfully (simulation)."
          : result.reason ?? "Withdrawal failed."
      );
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
              {amount}
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
          <strong>{localMessage || withdrawalDraft.successMessage || `Balance ${wallet.balance.toFixed(2)}`}</strong>
          <span>Simulation only. No external payout is sent.</span>
        </div>
        <button className="welcomeButton compactPrimary" onClick={requestWithdrawal} type="button">
          Request Withdrawal
        </button>
      </section>
    </div>
  );
}
