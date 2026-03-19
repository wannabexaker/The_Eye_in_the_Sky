/*
Purpose: announces bonus entry with the awarded free spins
Layer: frontend (player-web)
Uses: shared shell asset manifest and slot bonus announcement state
*/

import { shellAssets } from "@/lib/assets/asset-manifest";

type BonusEntryOverlayProps = {
  open: boolean;
  freeSpins: number;
  onContinue: () => void;
};

export function BonusEntryOverlay({
  open,
  freeSpins,
  onContinue
}: BonusEntryOverlayProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="overlayBackdrop bonusBackdrop" role="presentation">
      <section aria-label="Bonus Entered" className="overlayModal welcomeModal bonusEntryModal">
        <header className="overlayHeader welcomeHeader bonusEntryHeader">
          <div className="welcomeLogoStack">
            <div
              aria-hidden="true"
              className="welcomeLogo bonusEntryLogo"
              style={{ backgroundImage: `url(${shellAssets.logo})` }}
            />
            <div className="overlayTitleBlock welcomeTitleBlock">
              <h2>Sky Opens</h2>
              <span className="overlayEyebrow">Bonus Unlocked</span>
            </div>
          </div>
        </header>

        <div className="overlayBody welcomeBody bonusEntryBody">
          <div
            aria-hidden="true"
            className="bonusEntryArt"
            style={{ backgroundImage: `url(${shellAssets.bonusOverlay})` }}
          />

          <p className="welcomeTagline">The chamber yields to divine fire.</p>
          <p className="welcomeCopy">
            You entered bonus mode and earned <strong>{freeSpins} free spins</strong>.
          </p>

          <div className="welcomeBonusCard bonusAwardCard">
            <span className="eyebrow">Free Spins Awarded</span>
            <strong>{freeSpins}</strong>
          </div>

          <button className="welcomeButton" onClick={onContinue} type="button">
            Enter Bonus
          </button>
        </div>
      </section>
    </div>
  );
}
