/*
Purpose: shows the final bonus payout before returning to base play
Layer: frontend (player-web)
Uses: win-presentation-types.ts and player bonus-summary state
*/

"use client";

import { motion, useReducedMotion } from "motion/react";
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
  const prefersReducedMotion = useReducedMotion();

  if (!summary) {
    return null;
  }

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className="winPresentationLayer is-bonus-summary"
      exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.985 }}
      initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.965 }}
      role="presentation"
      transition={{ duration: prefersReducedMotion ? 0.12 : 0.3, ease: "easeOut" }}
    >
      <motion.section
        animate={{ opacity: 1, y: 0 }}
        aria-label={summary.title}
        className={`winPresentationCard is-ack is-bonus-summary ${summary.variantTheme === "constellation" ? "is-constellation" : ""}`}
        exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -10 }}
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 18 }}
        transition={{ duration: prefersReducedMotion ? 0.12 : 0.28, ease: "easeOut" }}
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
      </motion.section>
    </motion.div>
  );
}
