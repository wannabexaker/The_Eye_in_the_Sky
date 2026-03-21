"use client";

import type { CSSProperties } from "react";
import { useMemo, useState } from "react";

type WinTier = "win" | "big_win" | "huge_win" | "super_win";

type TierPreset = {
  id: WinTier;
  title: string;
  subtitle: string;
  amount: number;
  multiple: number;
  probabilityHint: string;
  glowLevel: number;
  plateAsset: string;
};

const TIER_PRESETS: TierPreset[] = [
  {
    id: "win",
    title: "WIN",
    subtitle: "Base round payout",
    amount: 12.4,
    multiple: 2.4,
    probabilityHint: "Frequent",
    glowLevel: 0.2,
    plateAsset: "/assets/ui/win-glow-plate.png"
  },
  {
    id: "big_win",
    title: "BIG WIN",
    subtitle: "Momentum spike",
    amount: 38.6,
    multiple: 6.1,
    probabilityHint: "Uncommon",
    glowLevel: 0.45,
    plateAsset: "/assets/ui/big-win-glow-plate.png"
  },
  {
    id: "huge_win",
    title: "HUGE WIN",
    subtitle: "High tier impact",
    amount: 67.2,
    multiple: 9.8,
    probabilityHint: "Rare",
    glowLevel: 0.72,
    plateAsset: "/assets/ui/huge-win-glow-plate.png"
  },
  {
    id: "super_win",
    title: "SUPER WIN",
    subtitle: "Top ritual payout",
    amount: 119.2,
    multiple: 14.9,
    probabilityHint: "~0.8% target",
    glowLevel: 1,
    plateAsset: "/assets/ui/super-win-glow-plate.png"
  }
];

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(value);

export function WinTierPreview() {
  const [activeTier, setActiveTier] = useState<WinTier>("super_win");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const preset = useMemo(
    () => TIER_PRESETS.find((entry) => entry.id === activeTier) ?? TIER_PRESETS[0],
    [activeTier]
  );

  const plateClassName = preset.id === "win" ? "qaSimpleWinGlowPlate" : preset.id === "super_win" ? "qaSuperWinGlowPlate" : "qaBigWinGlowPlate";

  const openPreview = (tierId: WinTier) => {
    setActiveTier(tierId);
    setPreviewOpen(true);
    setPreviewKey((current) => current + 1);
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <style>{`
        .qaWinPresentationLayer {
          --win-glow-level: 0;
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          padding: 24px;
          pointer-events: auto;
        }

        .qaWinPresentationLayer::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(
              circle at center,
              rgba(226, 190, 112, calc(0.06 + (var(--win-glow-level) * 0.24))),
              transparent calc(24% + (var(--win-glow-level) * 12%))
            ),
            rgba(5, 5, 7, 0.28);
        }

        .qaWinPresentationCard {
          position: relative;
          z-index: 1;
          display: grid;
          justify-items: center;
          align-content: start;
          gap: 10px;
          min-width: min(460px, 100%);
          max-width: min(640px, calc(100vw - 48px));
          max-height: calc(100dvh - 48px);
          padding: 26px 28px;
          border-radius: 22px;
          border: 1px solid rgba(226, 190, 112, calc(0.16 + (var(--win-glow-level) * 0.18)));
          background: linear-gradient(180deg, rgba(12, 12, 16, 0.9), rgba(10, 10, 13, 0.96));
          box-shadow:
            0 22px 48px rgba(0, 0, 0, 0.34),
            0 0 calc(26px + (var(--win-glow-level) * 30px)) rgba(226, 190, 112, calc(0.08 + (var(--win-glow-level) * 0.24)));
          text-align: center;
          overflow: hidden;
          animation: qaWinPreviewPop 220ms cubic-bezier(0.2, 0.85, 0.2, 1);
        }

        .qaWinPresentationHero {
          position: relative;
          display: grid;
          place-items: center;
          width: 100%;
          min-height: clamp(132px, 21vw, 212px);
          isolation: isolate;
        }

        .qaBigWinGlowPlate {
          position: absolute;
          inset: 50% auto auto 50%;
          width: min(560px, 92%);
          height: clamp(152px, 24vw, 230px);
          transform: translate(-50%, -50%);
          background-position: center;
          background-repeat: no-repeat;
          background-size: contain;
          opacity: calc(0.7 + (var(--win-glow-level) * 0.25));
          pointer-events: none;
          z-index: 0;
          filter:
            saturate(calc(0.92 + (var(--win-glow-level) * 0.45)))
            brightness(calc(0.88 + (var(--win-glow-level) * 0.3)))
            drop-shadow(0 0 calc(22px + (var(--win-glow-level) * 28px)) rgba(226, 190, 112, calc(0.2 + (var(--win-glow-level) * 0.28))));
          animation: qaWinPlateBreath 1.8s ease-in-out infinite;
        }

        .qaSimpleWinGlowPlate {
          position: absolute;
          inset: 50% auto auto 50%;
          width: min(720px, 132%);
          height: clamp(189px, 30vw, 282px);
          transform: translate(-50%, -50%);
          background-position: center;
          background-repeat: no-repeat;
          background-size: contain;
          opacity: calc(0.44 + (var(--win-glow-level) * 0.34));
          pointer-events: none;
          z-index: 0;
          filter:
            saturate(calc(0.84 + (var(--win-glow-level) * 0.36)))
            brightness(calc(0.82 + (var(--win-glow-level) * 0.24)))
            drop-shadow(0 0 calc(14px + (var(--win-glow-level) * 24px)) rgba(226, 190, 112, calc(0.1 + (var(--win-glow-level) * 0.24))));
        }

        .qaSuperWinGlowPlate {
          position: absolute;
          inset: 50% auto auto 50%;
          width: min(640px, 98%);
          height: clamp(176px, 28vw, 268px);
          transform: translate(-50%, -50%);
          background-position: center;
          background-repeat: no-repeat;
          background-size: contain;
          opacity: 0.98;
          pointer-events: none;
          z-index: 0;
          filter:
            saturate(1.34)
            brightness(1.08)
            drop-shadow(0 0 36px rgba(226, 190, 112, 0.42))
            drop-shadow(0 0 16px rgba(255, 232, 165, 0.36));
          animation: qaSuperWinPlatePulse 0.92s ease-in-out infinite;
        }

        .qaWinPresentationLabel {
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

        .qaWinPresentationLabel::before,
        .qaWinPresentationLabel::after {
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

        .qaWinPresentationLabel::before {
          left: 18%;
        }

        .qaWinPresentationLabel::after {
          right: 18%;
        }

        .qaWinPresentationAmount {
          color: #fff4d0;
          font-family: var(--font-display), Georgia, serif;
          font-size: clamp(2.4rem, 4.4vw, 4rem);
          line-height: 1;
          text-align: center;
          text-shadow:
            -0.8px 0 0 rgba(8, 8, 10, 0.88),
            0.8px 0 0 rgba(8, 8, 10, 0.88),
            0 -0.8px 0 rgba(8, 8, 10, 0.88),
            0 0.8px 0 rgba(8, 8, 10, 0.88),
            0 2px 4px rgba(0, 0, 0, 0.42),
            0 0 calc(14px + (var(--win-glow-level) * 18px)) rgba(226, 190, 112, calc(0.16 + (var(--win-glow-level) * 0.24)));
          position: relative;
          z-index: 1;
        }

        .qaWinPresentationSubtitle {
          color: #f4efe6;
          font-family: var(--font-ui), Georgia, serif;
          font-size: 0.95rem;
          line-height: 1.34;
        }

        .qaWinProbabilityPill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid rgba(240, 202, 114, 0.22);
          padding: 4px 10px;
          color: #d8b16d;
          font-size: 12px;
          font-family: var(--font-ui), Georgia, serif;
        }

        .qaWinPresentationHint {
          color: rgba(244, 239, 230, 0.62);
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-family: var(--font-ui), Georgia, serif;
        }

        @keyframes qaWinPreviewPop {
          0% {
            opacity: 0;
            transform: translateY(14px) scale(0.9);
          }

          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes qaWinPlateBreath {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(0.99);
          }

          50% {
            transform: translate(-50%, -50%) scale(1.02);
          }
        }

        @keyframes qaSuperWinPlatePulse {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.92;
          }

          50% {
            transform: translate(-50%, -50%) scale(1.06);
            opacity: 1;
          }
        }
      `}</style>

      <p style={{ margin: 0, color: "#bda98d", fontSize: 13 }}>
        QA preview for visual staging only. This does not modify runtime math or RNG.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
        {TIER_PRESETS.map((tier) => (
          <button
            key={tier.id}
            onClick={() => openPreview(tier.id)}
            style={{
              borderRadius: 10,
              border: activeTier === tier.id ? "1px solid rgba(240, 202, 114, 0.44)" : "1px solid rgba(240, 202, 114, 0.14)",
              background: activeTier === tier.id ? "rgba(240, 202, 114, 0.16)" : "rgba(20, 14, 18, 0.8)",
              color: "#f8edd9",
              padding: "8px 10px",
              cursor: "pointer",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase"
            }}
            type="button"
          >
            {tier.title}
          </button>
        ))}
      </div>

      <div
        style={{
          borderRadius: 12,
          border: "1px solid rgba(240, 202, 114, 0.2)",
          padding: 12,
          background: "linear-gradient(180deg, rgba(16, 12, 15, 0.92), rgba(10, 8, 11, 0.96))",
          boxShadow: "0 10px 24px rgba(0,0,0,0.24)"
        }}
      >
        <p style={{ margin: 0, color: "#bda98d", fontSize: 12 }}>
          Click any tier button to open a real popup preview (win-style) and inspect the visual staging.
        </p>
      </div>

      {previewOpen ? (
        <div
          onClick={() => setPreviewOpen(false)}
          role="presentation"
          className={`qaWinPresentationLayer is-${preset.id}`}
          style={{ "--win-glow-level": preset.glowLevel } as CSSProperties}
        >
          <section
            key={previewKey}
            aria-label={`${preset.title} preview`}
            onClick={(event) => event.stopPropagation()}
            className="qaWinPresentationCard"
          >
            <span className="qaWinPresentationLabel">{preset.title}</span>

            <div className="qaWinPresentationHero">
              <div aria-hidden="true" className={plateClassName} style={{ backgroundImage: `url(${preset.plateAsset})` }} />
              <strong className="qaWinPresentationAmount">{formatMoney(preset.amount)}</strong>
            </div>

            <p className="qaWinPresentationSubtitle" style={{ margin: "0 0 14px" }}>
              x{preset.multiple.toFixed(1)} • {preset.subtitle}
            </p>

            <div className="qaWinProbabilityPill">
              Probability: {preset.probabilityHint}
            </div>

            <span className="qaWinPresentationHint">Click outside to close</span>
          </section>
        </div>
      ) : null}
    </div>
  );
}
