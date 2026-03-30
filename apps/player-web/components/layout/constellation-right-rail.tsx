/*
Purpose: renders a distinct branding rail for the constellation-simple variant
Layer: frontend (player-web)
Uses: shell asset manifest and bonus state
*/

import Image from "next/image";
import { useEffect, useState } from "react";
import { shellAssetSources, shellAssets } from "@/lib/assets/asset-manifest";

type ConstellationRightRailProps = {
  bonusActive: boolean;
  activeBonusSpins: number;
};

export function ConstellationRightRail({
  bonusActive,
  activeBonusSpins
}: ConstellationRightRailProps) {
  const sceneSources = bonusActive
    ? shellAssetSources.bonusOverlay
    : shellAssetSources.mainBackground;
  const [sceneSourceIndex, setSceneSourceIndex] = useState(0);

  useEffect(() => {
    setSceneSourceIndex(0);
  }, [bonusActive]);

  return (
    <aside className="sideRail rightRail brandingRail brandingRailConstellation">
      <section
        className="constellationBrandPanel"
        title="Constellation Simple identity panel."
      >
        <div
          aria-hidden="true"
          className="brandLogo constellationBrandLogo"
          style={{ backgroundImage: `url(${shellAssets.logo})` }}
        />
        <p className="constellationBrandLead">Constellation Simple</p>
      </section>

      <section
        className="constellationScenePanel"
        title={
          bonusActive
            ? `${activeBonusSpins} constellation spins are currently active in Sky Opens.`
            : "Constellation trigger and live state panel."
        }
      >
        <div className="constellationSceneHeader">
          <span className="eyebrow">
            {bonusActive ? "Sky Opens" : "Scatter Trigger"}
          </span>
          <strong>
            {bonusActive
              ? `${activeBonusSpins} constellation spins in motion`
              : "4+ Samsara opens the sequence."}
          </strong>
        </div>

        <div
          aria-hidden="true"
          className={`brandSceneArt constellationSceneArt ${bonusActive ? "is-active" : ""}`}
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

        <div className="constellationSceneFooter">
          <span>
            {bonusActive
              ? "Seraphim Eye multipliers settle once per winning turn."
              : "Full scatter rewards and rules live in the menu."}
          </span>
        </div>
      </section>
    </aside>
  );
}
