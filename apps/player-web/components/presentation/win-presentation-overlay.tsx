/*
Purpose: presents round wins and bonus totals with pause or acknowledgement
Layer: frontend (player-web)
Uses: slot presentation state from use-slot-machine.ts
*/

import type { WinPresentationEntry } from "@/lib/presentation/win-presentation-types";
import { shellAssets } from "@/lib/assets/asset-manifest";
import type { CSSProperties } from "react";

type WinPresentationOverlayProps = {
  presentation: WinPresentationEntry | null;
  onContinue: () => void;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

export function WinPresentationOverlay({
  presentation,
  onContinue
}: WinPresentationOverlayProps) {
  if (!presentation) {
    return null;
  }

  const hasWinPlate =
    presentation.kind === "round_win" ||
    presentation.kind === "big_win" ||
    presentation.kind === "huge_win" ||
    presentation.kind === "super_win";

  const plateClassName =
    presentation.kind === "round_win"
      ? "simpleWinGlowPlate"
      : presentation.kind === "super_win"
        ? "superWinGlowPlate"
        : "bigWinGlowPlate";

  const plateBackground =
    presentation.kind === "round_win"
      ? shellAssets.winFlowPlate
      : presentation.kind === "huge_win"
        ? shellAssets.hugeWinGlowPlate
        : presentation.kind === "super_win"
          ? shellAssets.superWinGlowPlate
          : shellAssets.bigWinGlowPlate;

  return (
    <div
      className={`winPresentationLayer is-${presentation.kind}`}
      onClick={onContinue}
      role="presentation"
      style={
        {
          "--win-glow-level": presentation.glowLevel,
          "--win-multiple": presentation.winMultiple
        } as CSSProperties
      }
    >
      <section
        aria-label={presentation.title}
        className={`winPresentationCard ${presentation.requireAcknowledgement ? "is-ack" : "is-auto"}`}
      >
        <span className="winPresentationLabel">{presentation.title}</span>

        <div className="winPresentationHero">
          {hasWinPlate ? (
            <div
              aria-hidden="true"
              className={plateClassName}
              style={{
                backgroundImage: `url(${plateBackground})`
              }}
            />
          ) : null}
          <strong className="winPresentationAmount">{formatMoney(presentation.amount)}</strong>
        </div>

        {presentation.subtitle ? (
          <p className="winPresentationSubtitle">{presentation.subtitle}</p>
        ) : null}

        {presentation.detailRows?.length ? (
          <div className="winPresentationDetails">
            {presentation.detailRows.map((row) => (
              <span key={row}>{row}</span>
            ))}
          </div>
        ) : null}

        {presentation.requireAcknowledgement ? (
          <button
            className="welcomeButton compactPrimary"
            onClick={(event) => {
              event.stopPropagation();
              onContinue();
            }}
            type="button"
          >
            {presentation.continueLabel ?? "Continue"}
          </button>
        ) : (
          <span className="winPresentationHint">Click to continue</span>
        )}
      </section>
    </div>
  );
}
