/*
Purpose: simulates deposits and records wallet credits
Layer: frontend (player-web)
Uses: player store deposit draft and wallet transactions
*/

import { useEffect, useState } from "react";
import { usePlayerUiStore } from "@/lib/state/player-store";

const depositAmounts = [20, 50, 100, 200, 500];

const parseAmount = (value: string) => {
  const parsed = Number(value.replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : null;
};

export function DepositModal() {
  const {
    depositDraft,
    setDepositAmount,
    setDepositField,
    startDepositProcessing,
    completeDeposit
  } = usePlayerUiStore();
  const [localMessage, setLocalMessage] = useState("");
  const [amountInput, setAmountInput] = useState(String(depositDraft.amount));

  useEffect(() => {
    setAmountInput(String(depositDraft.amount));
  }, [depositDraft.amount]);

  const confirmDeposit = () => {
    const parsedAmount = parseAmount(amountInput);

    if (parsedAmount === null || parsedAmount <= 0) {
      setLocalMessage("Enter a valid deposit amount.");
      return;
    }

    // commit typed amount before processing
    setDepositAmount(parsedAmount);
    setLocalMessage("Processing payment...");
    startDepositProcessing();

    window.setTimeout(() => {
      completeDeposit();
      setLocalMessage("Deposit successful");
    }, 900);
  };

  return (
    <div className="walletModalGrid">
      <section className="modalSection">
        <p className="eyebrow">Select Amount</p>
        <div className="chipRow chipRowInlineInput">
          {depositAmounts.map((amount) => (
            <button
              className={`controlChip ${depositDraft.amount === amount ? "is-active" : ""}`}
              key={amount}
              onClick={() => setDepositAmount(amount)}
              type="button"
            >
              {amount}
            </button>
          ))}
          <input
            aria-label="Custom deposit amount"
            className="chipInputInline"
            inputMode="decimal"
            onBlur={() => {
              const parsedAmount = parseAmount(amountInput);
              if (parsedAmount !== null && parsedAmount > 0) {
                setDepositAmount(parsedAmount);
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
                  setDepositAmount(parsedAmount);
                  setAmountInput(String(parsedAmount));
                }
              }
            }}
            placeholder="1000"
            type="text"
            value={amountInput}
          />
        </div>
      </section>

      <section className="modalSection formGrid">
        <label className="inputGroup">
          <span>Card Holder</span>
          <input
            onChange={(event) => setDepositField("cardholder", event.target.value)}
            value={depositDraft.cardholder}
          />
        </label>

        <label className="inputGroup">
          <span>Card Number</span>
          <input
            onChange={(event) => setDepositField("cardNumber", event.target.value)}
            value={depositDraft.cardNumber}
          />
        </label>

        <label className="inputGroup">
          <span>Expiry</span>
          <input
            onChange={(event) => setDepositField("expiry", event.target.value)}
            value={depositDraft.expiry}
          />
        </label>

        <label className="inputGroup">
          <span>CVV</span>
          <input
            onChange={(event) => setDepositField("cvv", event.target.value)}
            value={depositDraft.cvv}
          />
        </label>
      </section>

      <section className="modalSection modalFooterRow">
        <div className="modalFeedback">
          <strong>{localMessage || depositDraft.successMessage || `+${depositDraft.amount} ready`}</strong>
          <span>Simulation only. No real payment is processed.</span>
        </div>
        <button className="welcomeButton compactPrimary" onClick={confirmDeposit} type="button">
          Confirm Deposit
        </button>
      </section>
    </div>
  );
}
