/*
Purpose: renders compact wallet transaction history in the side rail
Layer: frontend (player-web)
Uses: wallet transactions from the player store
*/

import type { WalletTransaction } from "../lib/player-store";

const signFor = (type: WalletTransaction["type"]) =>
  type === "withdrawal" || type === "bet" ? "-" : "+";

export function WalletActivityPanel({
  transactions,
  onOpenHistory
}: {
  transactions: WalletTransaction[];
  onOpenHistory: () => void;
}) {
  return (
    <section className="inlineRounds">
      <div className="panelHeader">
        <p className="eyebrow">Wallet</p>
        <button className="secondaryAction compactAction" onClick={onOpenHistory} type="button">
          Full
        </button>
      </div>

      <div className="history compactHistory">
        {transactions.length === 0 ? (
          <p className="emptyState">No wallet activity yet.</p>
        ) : (
          transactions.slice(0, 4).map((transaction) => (
            <article className="historyItem compact" key={transaction.id}>
              <strong>
                {signFor(transaction.type)}
                {transaction.amount} {transaction.label}
              </strong>
              <span>{transaction.type.replace("_", " ")}</span>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
