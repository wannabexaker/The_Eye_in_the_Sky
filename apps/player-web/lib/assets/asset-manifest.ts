/*
Purpose: centralizes runtime asset paths for the playable client
Layer: frontend (player-web)
Used by: page.tsx, game-header.tsx, samsara-meter.tsx, pixi-temple-board.tsx
*/

import type { SymbolId } from "@eye/game-engine";

export type GraphicsQuality = "high" | "low";

const normalizeGraphicsQuality = (quality: GraphicsQuality) =>
  quality === "low" ? "low" : "high";

const assetRootByQuality: Record<GraphicsQuality, string> = {
  high: "/assets",
  low: "/assets/lite"
};

const assetExtensionByQuality: Record<GraphicsQuality, "png" | "webp"> = {
  high: "webp",
  low: "png"
};

const shellAssetSlugs = {
  mainBackground: "backgrounds/bg-main-temple-sky",
  bonusOverlay: "backgrounds/bonus-sky-opens",
  boardFrame: "ui/frame-board-main",
  winFlowPlate: "ui/win-glow-plate",
  bigWinGlowPlate: "ui/big-win-glow-plate",
  hugeWinGlowPlate: "ui/huge-win-glow-plate",
  superWinGlowPlate: "ui/super-win-glow-plate",
  logo: "ui/logo-eye-in-the-sky",
  meterEye: "ui/meter-eye-core"
} as const;

export type ShellAssets = {
  [Key in keyof typeof shellAssetSlugs]: string;
};

export const getShellAssets = (quality: GraphicsQuality): ShellAssets => {
  const normalized = normalizeGraphicsQuality(quality);
  const root = assetRootByQuality[normalized];
  const extension = assetExtensionByQuality[normalized];

  return {
    mainBackground: `${root}/${shellAssetSlugs.mainBackground}.${extension}`,
    bonusOverlay: `${root}/${shellAssetSlugs.bonusOverlay}.${extension}`,
    boardFrame: `${root}/${shellAssetSlugs.boardFrame}.${extension}`,
    winFlowPlate: `${root}/${shellAssetSlugs.winFlowPlate}.${extension}`,
    bigWinGlowPlate: `${root}/${shellAssetSlugs.bigWinGlowPlate}.${extension}`,
    hugeWinGlowPlate: `${root}/${shellAssetSlugs.hugeWinGlowPlate}.${extension}`,
    superWinGlowPlate: `${root}/${shellAssetSlugs.superWinGlowPlate}.${extension}`,
    logo: `${root}/${shellAssetSlugs.logo}.${extension}`,
    meterEye: `${root}/${shellAssetSlugs.meterEye}.${extension}`
  };
};

export const shellAssets = getShellAssets("high");

const shellFallbackAsset = (slug: string) => [
  `/assets/${slug}.webp`,
  `/assets/${slug}.png`,
] as const;

export const getShellAssetSources = (quality: GraphicsQuality) => {
  const normalized = normalizeGraphicsQuality(quality);

  return {
    mainBackground:
      normalized === "low"
        ? [
            `/assets/lite/${shellAssetSlugs.mainBackground}.png`,
            ...shellFallbackAsset(shellAssetSlugs.mainBackground)
          ]
        : shellFallbackAsset(shellAssetSlugs.mainBackground),
    bonusOverlay:
      normalized === "low"
        ? [
            `/assets/lite/${shellAssetSlugs.bonusOverlay}.png`,
            ...shellFallbackAsset(shellAssetSlugs.bonusOverlay)
          ]
        : shellFallbackAsset(shellAssetSlugs.bonusOverlay)
  } as const;
};

export type ShellAssetSources = ReturnType<typeof getShellAssetSources>;

export const shellAssetSources = getShellAssetSources("high");

const buildSymbolAssetSources = (
  slug: string,
  quality: GraphicsQuality
): readonly string[] => {
  const highSources = [
    `/assets/symbols/${slug}.webp`,
    `/assets/symbols/${slug}.png`
  ];

  return normalizeGraphicsQuality(quality) === "low"
    ? [`/assets/lite/symbols/${slug}.png`, ...highSources]
    : highSources;
};

export type SymbolAssetSources = Record<SymbolId, readonly string[]>;

export const getSymbolAssetSources = (quality: GraphicsQuality): SymbolAssetSources => ({
  ashen_sigil: buildSymbolAssetSources("symbol-ashen-sigil", quality),
  broken_halo: buildSymbolAssetSources("symbol-broken-halo", quality),
  ritual_dagger: buildSymbolAssetSources("symbol-ritual-dagger", quality),
  sealed_scroll: buildSymbolAssetSources("symbol-sealed-scroll", quality),
  seraphim_feather: buildSymbolAssetSources("symbol-seraphim-feather", quality),
  burning_crown: buildSymbolAssetSources("symbol-burning-crown", quality),
  ophidian_relic: buildSymbolAssetSources("symbol-ophidian-relic", quality),
  celestial_gate: buildSymbolAssetSources("symbol-celestial-gate", quality),
  seraphim_eye: buildSymbolAssetSources("symbol-seraphim-eye", quality),
  samsara: buildSymbolAssetSources("symbol-samsara", quality),
  ouroboros: buildSymbolAssetSources("symbol-ouroboros", quality),
  panepoptis_ophthalmos: buildSymbolAssetSources("symbol-panepoptis-ophthalmos", quality),
  wild: buildSymbolAssetSources("symbol-wild", quality)
});

export const symbolAssetSources = getSymbolAssetSources("high");

export const getOuroborosRingAsset = (quality: GraphicsQuality) =>
  normalizeGraphicsQuality(quality) === "low"
    ? "/assets/lite/ui/ouroboros-ring.png"
    : "/assets/ui/ouroboros-ring.webp";
