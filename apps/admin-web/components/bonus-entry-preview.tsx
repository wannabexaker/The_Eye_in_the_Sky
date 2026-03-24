"use client";

import { useState } from "react";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

export function BonusEntryPreview() {
  const [open, setOpen] = useState(false);
  const announcement = {
    title: "BONUS TRIGGERED",
    freeSpins: 7,
    entryWin: 124.5,
    sourceLabel: "BONUS ENTRY WIN",
    continueLabel: "Enter Bonus"
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <style>{`
        .overlayBackdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(5, 5, 7, 0.66);
          backdrop-filter: blur(10px);
        }

        .overlayModal {
          width: min(720px, 100%);
          max-height: min(80dvh, 780px);
          overflow: hidden;
          border-radius: 18px;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          background: linear-gradient(180deg, rgba(18, 15, 19, 0.98), rgba(10, 10, 13, 0.98));
          color: #f8edd9;
        }

        .winPresentationLabel {
          position: relative;
          z-index: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: clamp(156px, 22vw, 228px);
          padding: 8px 20px;
          margin-top: 2px;
          border: 1px solid rgba(226, 190, 112, 0.44);
          clip-path: polygon(8% 0, 92% 0, 100% 50%, 92% 100%, 8% 100%, 0 50%);
          background:
            linear-gradient(180deg, rgba(22, 20, 18, 0.88), rgba(12, 12, 15, 0.9)),
            linear-gradient(90deg, rgba(226, 190, 112, 0.14), rgba(226, 190, 112, 0.04));
          box-shadow:
            0 0 0 1px rgba(0, 0, 0, 0.38) inset,
            0 8px 20px rgba(0, 0, 0, 0.24),
            0 0 14px rgba(226, 190, 112, 0.14);
          color: #e2be70;
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(0.86rem, 1vw, 1rem);
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .winPresentationLabel::before,
        .winPresentationLabel::after {
          content: "";
          position: absolute;
          top: -7px;
          width: 0;
          height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-bottom: 8px solid rgba(226, 190, 112, 0.52);
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.32));
        }

        .winPresentationLabel::before {
          left: 18%;
        }

        .winPresentationLabel::after {
          right: 18%;
        }

        .bonusWinBackdrop {
          backdrop-filter: blur(10px);
        }

        .bonusWinModal {
          display: grid;
          grid-template-rows: auto auto;
          width: min(540px, calc(100vw - 32px));
          border-radius: 24px;
          overflow: hidden;
          justify-items: center;
          background:
            linear-gradient(180deg, rgba(18, 15, 19, 0.98), rgba(10, 10, 13, 0.98)),
            radial-gradient(circle at top, rgba(226, 190, 112, 0.12), transparent 34%);
        }

        .bonusWinHeader {
          display: grid;
          justify-items: center;
          gap: 10px;
          width: 100%;
          padding: 24px 24px 12px;
          text-align: center;
          border-bottom: 0;
        }

        .bonusWinHeading {
          margin: 0;
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(1.5rem, 1.9vw, 2rem);
          line-height: 1;
        }

        .bonusWinLead {
          margin: 0;
          max-width: 36ch;
          color: rgba(244, 239, 230, 0.76);
          font-size: 0.9rem;
          line-height: 1.35;
        }

        .bonusWinBody {
          display: grid;
          align-content: start;
          gap: 16px;
          width: 100%;
          padding: 0 24px 24px;
          text-align: center;
          justify-items: center;
          overflow: visible;
        }

        .bonusWinCard {
          display: grid;
          gap: 8px;
          width: min(100%, 380px);
          padding: 18px 18px 16px;
          border: 1px solid rgba(226, 190, 112, 0.16);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.03);
        }

        .eyebrow {
          color: rgba(244, 239, 230, 0.64);
          font-family: var(--font-display), Georgia, serif;
          font-size: 0.72rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .bonusWinAmount {
          color: #e2be70;
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(1.4rem, 1.9vw, 2rem);
          line-height: 1;
          text-shadow: 0 0 18px rgba(226, 190, 112, 0.24);
        }

        .bonusWinInfoGrid {
          display: grid;
          gap: 8px;
          width: min(100%, 380px);
        }

        .bonusWinInfoRow {
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(226, 190, 112, 0.12);
          border-radius: 10px;
          padding: 8px 10px;
          background: rgba(255, 255, 255, 0.02);
        }

        .bonusWinInfoRow span {
          color: rgba(244, 239, 230, 0.74);
          font-size: 0.9rem;
        }

        .bonusWinInfoRow strong {
          color: rgba(244, 239, 230, 0.94);
          font-family: var(--font-display), Georgia, serif;
          font-size: 0.9rem;
          text-align: right;
        }

        .welcomeButton {
          border: 1px solid rgba(226, 190, 112, 0.26);
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(226, 190, 112, 0.96), rgba(170, 123, 46, 0.96));
          color: #17120f;
          padding: 12px 20px;
          font-family: var(--font-display), Georgia, serif;
          font-size: 0.82rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
        }

        .compactPrimary {
          padding: 10px 16px;
        }
      `}</style>

      <button
        onClick={() => setOpen(true)}
        style={{
          border: "1px solid rgba(226, 190, 112, 0.36)",
          background: "linear-gradient(180deg, rgba(27, 22, 30, 0.96), rgba(14, 12, 16, 0.96))",
          color: "#f4e7c8",
          borderRadius: 12,
          fontWeight: 700,
          letterSpacing: "0.03em",
          padding: "10px 14px",
          cursor: "pointer"
        }}
        type="button"
      >
        Preview Sky Opens Window
      </button>

      <p style={{ margin: 0, color: "#bda98d", fontSize: 12 }}>
        Opens the bonus announcement overlay directly for QA checks.
      </p>

      {open ? (
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

              <button className="welcomeButton compactPrimary" onClick={() => setOpen(false)} type="button">
                {announcement.continueLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
