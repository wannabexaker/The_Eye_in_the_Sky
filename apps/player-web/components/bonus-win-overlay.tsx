/*
Purpose: announces bonus entry and shows the triggering payout clearly
Layer: frontend (player-web)
Uses: win-presentation-types.ts and shell asset manifest
*/

import { shellAssets } from "../lib/asset-manifest";
import type { BonusAnnouncementEntry } from "../lib/presentation/win-presentation-types";

type BonusWinOverlayProps = {
  announcement: BonusAnnouncementEntry | null;
  onContinue: () => void;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

export function BonusWinOverlay({
  announcement,
  onContinue
}: BonusWinOverlayProps) {
  if (!announcement) {
    return null;
  }

  return (
    <div className="overlayBackdrop bonusBackdrop bonusWinBackdrop" role="presentation">
      <section aria-label={announcement.title} className="overlayModal bonusWinModal">
        <header className="overlayHeader bonusWinHeader">
          <div
            aria-hidden="true"
            className="bonusWinLogo"
            style={{ backgroundImage: `url(${shellAssets.logo})` }}
          />
          <span className="winPresentationLabel">{announcement.title}</span>
          <h2 className="bonusWinHeading">Sky Opens</h2>
        </header>

        <div className="overlayBody bonusWinBody">
          <div className="bonusWinCard">
            <span className="eyebrow">{announcement.sourceLabel}</span>
            <strong className="bonusWinAmount">+{formatMoney(announcement.entryWin)}</strong>
          </div>

          <div className="bonusWinMeta">
            <span>{announcement.freeSpins} free spins awarded</span>
            <span>The bonus total now tracks separately.</span>
          </div>

          <button className="welcomeButton compactPrimary" onClick={onContinue} type="button">
            {announcement.continueLabel ?? "Continue"}
          </button>
        </div>
      </section>
    </div>
  );
}
