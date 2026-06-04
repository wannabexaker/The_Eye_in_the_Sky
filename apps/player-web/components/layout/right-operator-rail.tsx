/*
Purpose: renders the right branding rail with decorative identity content
Layer: frontend (player-web)
Uses: shell asset manifest and bonus state
*/

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ShellAssets, ShellAssetSources } from "@/lib/assets/asset-manifest";

type RightOperatorRailProps = {
  bonusActive: boolean;
  activeBonusSpins: number;
  shellAssets: ShellAssets;
  shellAssetSources: ShellAssetSources;
  variantId?: "main_cluster" | "constellation_simple";
};

export function RightOperatorRail({
  bonusActive,
  activeBonusSpins,
  shellAssets,
  shellAssetSources,
  variantId = "main_cluster"
}: RightOperatorRailProps) {
  const isConstellationVariant = variantId === "constellation_simple";
  const sceneSources = bonusActive
    ? shellAssetSources.bonusOverlay
    : shellAssetSources.mainBackground;
  const [sceneSourceIndex, setSceneSourceIndex] = useState(0);

  useEffect(() => {
    setSceneSourceIndex(0);
  }, [bonusActive, shellAssetSources]);

  return (
    <aside className="sideRail rightRail brandingRail">
      <section
        className="inlineRounds brandPanel"
        title="The Eye in the Sky brand panel."
      >
        <div
          aria-hidden="true"
          className="brandLogo"
          style={{ backgroundImage: `url(${shellAssets.logo})` }}
        />
        <p className="brandTagline">
          {isConstellationVariant
            ? "Scatter-led omens traced across the open constellation."
            : "Sacred surveillance from beyond the temple gates."}
        </p>
      </section>

      <section
        className="inlineRounds brandScenePanel"
        title={bonusActive ? `${activeBonusSpins} bonus spins are currently active in Sky Opens.` : "Temple Watch scenic panel."}
      >
        <div
          aria-hidden="true"
          className={`brandSceneArt ${bonusActive ? "is-active" : ""}`}
        >
          <Image
            alt=""
            className="brandSceneImage"
            fill
            onError={() => {
              if (sceneSourceIndex < sceneSources.length - 1) {
                setSceneSourceIndex((current) => current + 1);
              }
            }}
            src={sceneSources[sceneSourceIndex]}
            unoptimized
          />
        </div>
        <div className="brandSceneCopy">
          <span className="eyebrow">
            {bonusActive
              ? isConstellationVariant
                ? "Constellation"
                : "Sky Opens"
              : "Temple Watch"}
          </span>
          <strong>
            {bonusActive
              ? isConstellationVariant
                ? `${activeBonusSpins} constellation spins in motion`
                : `${activeBonusSpins} free spins in motion`
              : "The Eye remains fixed above the ritual."}
          </strong>
        </div>
      </section>
    </aside>
  );
}
