/*
Purpose: shows the first-run welcome bonus gate
Layer: frontend (player-web)
Uses: player store welcome state and wallet bonus action
*/

import { shellAssets } from "@/lib/assets/asset-manifest";

type WelcomeOverlayProps = {
  open: boolean;
  onStart: () => void | Promise<void>;
  busy?: boolean;
};

export function WelcomeOverlay({ open, onStart, busy = false }: WelcomeOverlayProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="overlayBackdrop welcomeBackdrop" role="presentation">
      <section aria-label="Welcome" className="overlayModal welcomeModal">
        <header className="overlayHeader welcomeHeader">
          <div className="welcomeLogoStack">
            <div
              aria-hidden="true"
              className="welcomeLogo"
              style={{ backgroundImage: `url(${shellAssets.logo})` }}
            />
            <div className="overlayTitleBlock welcomeTitleBlock">
              <h2>Begin the Ritual</h2>
              <span className="overlayEyebrow">Sacred Surveillance</span>
            </div>
          </div>
        </header>

        <div className="overlayBody welcomeBody">
          <p className="welcomeTagline">The temple watches every spin.</p>
          <p className="welcomeCopy">
            Welcome to The Eye in the Sky. Begin your ritual and test your fate.
          </p>

          <div className="welcomeBonusCard">
            <span className="eyebrow">Welcome Bonus</span>
            <strong>+500 Credits</strong>
          </div>

          <button className="welcomeButton" disabled={busy} onClick={() => void onStart()} type="button">
            {busy ? "Applying..." : "Start Playing"}
          </button>
        </div>
      </section>
    </div>
  );
}
