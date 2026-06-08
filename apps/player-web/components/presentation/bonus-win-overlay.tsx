/*
Purpose: announces bonus entry and shows the triggering payout clearly
Layer: frontend (player-web)
Uses: win-presentation-types.ts
*/

"use client";

import { motion, useReducedMotion } from "motion/react";
import type { BonusAnnouncementEntry } from "@/lib/presentation/win-presentation-types";

type BonusWinOverlayProps = {
  announcement: BonusAnnouncementEntry | null;
  locked: boolean;
  onContinue: () => void;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

export function BonusWinOverlay({
  announcement,
  locked,
  onContinue
}: BonusWinOverlayProps) {
  const prefersReducedMotion = useReducedMotion();

  if (!announcement) {
    return null;
  }

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="overlayBackdrop bonusBackdrop bonusWinBackdrop"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      role="presentation"
      transition={{ duration: prefersReducedMotion ? 0.12 : 0.2, ease: "easeOut" }}
    >
      <motion.section
        animate={{ opacity: 1, scale: 1, y: 0 }}
        aria-label={announcement.title}
        className={`overlayModal bonusWinModal ${announcement.variantTheme === "constellation" ? "is-constellation" : ""}`}
        exit={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.985, y: prefersReducedMotion ? 0 : -10 }}
        initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.96, y: prefersReducedMotion ? 0 : 18 }}
        transition={{ duration: prefersReducedMotion ? 0.12 : 0.34, ease: "easeOut" }}
      >
        <header className="bonusWinHeader">
          <span className="winPresentationLabel">{announcement.title}</span>
          <h2 className="bonusWinHeading">{announcement.heading ?? "Sky Opens"}</h2>
          <p className="bonusWinLead">
            {announcement.lead ?? "The temple vault is open. Bonus sequence is now active."}
          </p>
        </header>

        <div className="bonusWinBody">
          <div className="bonusWinCard">
            <span className="eyebrow">{announcement.sourceLabel}</span>
            <strong className="bonusWinAmount">+{formatMoney(announcement.entryWin)}</strong>
          </div>

          <div className="bonusWinInfoGrid">
            <div className="bonusWinInfoRow">
              <span>{announcement.freeSpinsLabel ?? "Free Spins"}</span>
              <strong>{announcement.freeSpins}</strong>
            </div>
            <div className="bonusWinInfoRow">
              <span>{announcement.sourceLabel}</span>
              <strong>+{formatMoney(announcement.entryWin)}</strong>
            </div>
            <div className="bonusWinInfoRow">
              <span>{announcement.modeLabel ?? "Mode"}</span>
              <strong>{announcement.modeValue ?? "Sky Opens Active"}</strong>
            </div>
          </div>

          <button
            className="welcomeButton compactPrimary"
            disabled={locked}
            onKeyDown={(event) => event.preventDefault()}
            onKeyUp={(event) => event.preventDefault()}
            onClick={onContinue}
            type="button"
          >
            {announcement.continueLabel ?? "Continue"}
          </button>
        </div>
      </motion.section>
    </motion.div>
  );
}
