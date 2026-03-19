/*
Purpose: centralizes runtime asset paths for the playable client
Layer: frontend (player-web)
Used by: page.tsx, game-header.tsx, samsara-meter.tsx, pixi-temple-board.tsx
*/

import type { SymbolId } from "@eye/game-engine";

export const shellAssets = {
  mainBackground: "/assets/backgrounds/bg-main-temple-sky.png",
  bonusOverlay: "/assets/backgrounds/bonus-sky-opens.png",
  boardFrame: "/assets/ui/frame-board-main.png",
  bigWinGlowPlate: "/assets/ui/big-win-glow-plate.png",
  logo: "/assets/ui/logo-eye-in-the-sky.png",
  meterEye: "/assets/ui/meter-eye-core.svg"
} as const;

export const shellAssetSources = {
  mainBackground: [
    "/assets/backgrounds/bg-main-temple-sky.png",
    "/assets/backgrounds/bg-main-temple-sky.svg"
  ],
  bonusOverlay: [
    "/assets/backgrounds/bonus-sky-opens.png",
    "/assets/backgrounds/bonus-sky-opens.svg"
  ]
} as const;

const buildSymbolAssetSources = (slug: string) => [
  `/assets/symbols/${slug}.png`,
  `/assets/symbols/${slug}.svg`
] as const;

export const symbolAssetSources: Record<SymbolId, readonly string[]> = {
  ashen_sigil: buildSymbolAssetSources("symbol-ashen-sigil"),
  broken_halo: buildSymbolAssetSources("symbol-broken-halo"),
  ritual_dagger: buildSymbolAssetSources("symbol-ritual-dagger"),
  sealed_scroll: buildSymbolAssetSources("symbol-sealed-scroll"),
  seraphim_feather: buildSymbolAssetSources("symbol-seraphim-feather"),
  burning_crown: buildSymbolAssetSources("symbol-burning-crown"),
  ophidian_relic: buildSymbolAssetSources("symbol-ophidian-relic"),
  celestial_gate: buildSymbolAssetSources("symbol-celestial-gate"),
  seraphim_eye: buildSymbolAssetSources("symbol-seraphim-eye"),
  samsara: buildSymbolAssetSources("symbol-samsara"),
  ouroboros: buildSymbolAssetSources("symbol-ouroboros"),
  panepoptis_ophthalmos: buildSymbolAssetSources("symbol-panepoptis-ophthalmos"),
  wild: buildSymbolAssetSources("symbol-wild")
};
