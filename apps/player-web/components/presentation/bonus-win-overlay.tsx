/*
Purpose: announces bonus entry and shows the triggering payout clearly
Layer: frontend (player-web)
Uses: win-presentation-types.ts
*/

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
  if (!announcement) {
    return null;
  }

  return (
    <div className="overlayBackdrop bonusBackdrop bonusWinBackdrop" role="presentation">
      <section aria-label={announcement.title} className="overlayModal bonusWinModal">
        <header className="bonusWinHeader">
          <span className="winPresentationLabel">{announcement.title}</span>
          <h2 className="bonusWinHeading">Sky Opens</h2>
          <p className="bonusWinLead">The temple vault is open. Bonus sequence is now active.</p>
        </header>

        <div className="bonusWinBody">
          <div className="bonusWinCard">
            <span className="eyebrow">{announcement.sourceLabel}</span>
            <strong className="bonusWinAmount">+{formatMoney(announcement.entryWin)}</strong>
          </div>

          <div className="bonusWinInfoGrid">
            <div className="bonusWinInfoRow">
              <span>Free Spins</span>
              <strong>{announcement.freeSpins}</strong>
            </div>
            <div className="bonusWinInfoRow">
              <span>Bonus Entry Win</span>
              <strong>+{formatMoney(announcement.entryWin)}</strong>
            </div>
            <div className="bonusWinInfoRow">
              <span>Mode</span>
              <strong>Sky Opens Active</strong>
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
      </section>
    </div>
  );
}
