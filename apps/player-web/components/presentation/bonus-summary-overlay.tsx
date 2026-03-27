/*
Purpose: shows the final bonus payout before returning to base play
Layer: frontend (player-web)
Uses: win-presentation-types.ts and player bonus-summary state
*/

import type { BonusSummaryEntry } from "@/lib/presentation/win-presentation-types";

type BonusSummaryOverlayProps = {
  locked: boolean;
  summary: BonusSummaryEntry | null;
  onContinue: () => void;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

export function BonusSummaryOverlay({
  locked,
  summary,
  onContinue
}: BonusSummaryOverlayProps) {
  if (!summary) {
    return null;
  }

  return (
    <div className="winPresentationLayer is-bonus-summary" role="presentation">
      <section
        aria-label={summary.title}
        className={`winPresentationCard is-ack is-bonus-summary ${summary.variantTheme === "constellation" ? "is-constellation" : ""}`}
      >
        <span className="winPresentationLabel">{summary.title}</span>
        <p className="winPresentationSubtitle">{summary.subtitle}</p>
        <span className="bonusSummaryCaption">{summary.totalWinLabel ?? "TOTAL BONUS WIN"}</span>
        <strong className="winPresentationAmount">{formatMoney(summary.totalWin)}</strong>

        <button
          className="welcomeButton compactPrimary"
          disabled={locked}
          onClick={onContinue}
          type="button"
        >
          {summary.continueLabel ?? "Continue"}
        </button>
      </section>
    </div>
  );
}
