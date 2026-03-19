import type { SpinResult } from "@eye/game-engine";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

export function RecentRoundsPanel({ history }: { history: SpinResult[] }) {
  return (
    <section className="inlineRounds">
      <div className="panelHeader">
        <p className="eyebrow">Recent</p>
      </div>
      <div className="history compactHistory">
        {history.length === 0 ? (
          <p className="emptyState">No rounds yet.</p>
        ) : (
          history.slice(0, 3).map((result, index) => {
            const label =
              result.totalWin > 0
                ? `WIN ${formatMoney(result.totalWin)} | x${result.appliedWinMultiplier} | ${result.cascades.length} cascades`
                : "LOSS";

            return (
              <article className="historyItem compact" key={`${result.totalWin}-${index}`}>
                <strong>{label}</strong>
                <span>{result.mode === "bonus" ? "bonus" : "base"}</span>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
