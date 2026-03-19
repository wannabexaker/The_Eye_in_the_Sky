/*
Purpose: renders the right branding rail with decorative identity content
Layer: frontend (player-web)
Uses: shell asset manifest and bonus state
*/

import Image from "next/image";
import { useEffect, useState } from "react";
import { shellAssetSources, shellAssets } from "@/lib/assets/asset-manifest";

type RightOperatorRailProps = {
  bonusActive: boolean;
  activeBonusSpins: number;
};

export function RightOperatorRail({
  bonusActive,
  activeBonusSpins
}: RightOperatorRailProps) {
  const sceneSources = bonusActive
    ? shellAssetSources.bonusOverlay
    : shellAssetSources.mainBackground;
  const [sceneSourceIndex, setSceneSourceIndex] = useState(0);

  useEffect(() => {
    setSceneSourceIndex(0);
  }, [bonusActive]);

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
        <p className="brandTagline">Sacred surveillance from beyond the temple gates.</p>
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
          <span className="eyebrow">{bonusActive ? "Sky Opens" : "Temple Watch"}</span>
          <strong>{bonusActive ? `${activeBonusSpins} free spins in motion` : "The Eye remains fixed above the ritual."}</strong>
        </div>
      </section>
    </aside>
  );
}
