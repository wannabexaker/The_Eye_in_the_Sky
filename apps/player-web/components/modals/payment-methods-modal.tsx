/*
Purpose: manages simulated payout methods stored locally
Layer: frontend (player-web)
Uses: player store payment methods and draft form
*/

import { usePlayerUiStore } from "@/lib/state/player-store";

export function PaymentMethodsModal() {
  const {
    paymentMethods,
    paymentMethodDraft,
    setPaymentMethodDraftField,
    addPaymentMethod,
    removePaymentMethod
  } = usePlayerUiStore();

  return (
    <div className="walletModalGrid">
      <section className="modalSection formGrid">
        <label className="inputGroup">
          <span>Method Type</span>
          <select
            onChange={(event) => setPaymentMethodDraftField("type", event.target.value)}
            value={paymentMethodDraft.type}
          >
            <option value="card">Card</option>
            <option value="bank">Bank Account</option>
            <option value="crypto">Crypto Wallet</option>
          </select>
        </label>

        <label className="inputGroup">
          <span>Label</span>
          <input
            onChange={(event) => setPaymentMethodDraftField("label", event.target.value)}
            placeholder="Temple Visa"
            value={paymentMethodDraft.label}
          />
        </label>

        <label className="inputGroup">
          <span>Last 4 / Ref</span>
          <input
            onChange={(event) => setPaymentMethodDraftField("last4", event.target.value)}
            placeholder="4242"
            value={paymentMethodDraft.last4}
          />
        </label>
      </section>

      <section className="modalSection modalFooterRow">
        <div className="modalFeedback">
          <strong>Stored locally</strong>
          <span>Used by the simulated withdrawal flow.</span>
        </div>
        <button className="welcomeButton compactPrimary" onClick={addPaymentMethod} type="button">
          Add Method
        </button>
      </section>

      <section className="modalSection">
        <p className="eyebrow">Saved Methods</p>
        <div className="history compactHistory">
          {paymentMethods.length === 0 ? (
            <p className="emptyState">No payout methods saved yet.</p>
          ) : (
            paymentMethods.map((method) => (
              <article className="historyItem" key={method.id}>
                <div>
                  <strong>{method.label}</strong>
                  <span>
                    {method.type}
                    {method.last4 ? ` • ${method.last4}` : ""}
                    {method.id === "pm-default-card" ? " • default" : ""}
                  </span>
                </div>
                {method.id === "pm-default-card" ? (
                  <span className="controlHelper inline">Default</span>
                ) : (
                  <button
                    className="secondaryAction compactAction"
                    onClick={() => removePaymentMethod(method.id)}
                    type="button"
                  >
                    Remove
                  </button>
                )}
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
