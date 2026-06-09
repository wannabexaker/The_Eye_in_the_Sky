/*
Purpose: renders the animated game board and presentation effects
Layer: frontend (player-web)
Uses: PixiJS, engine round results, and the shared particle system
*/

"use client";

import type { CascadeWin, SpinResult, SymbolId } from "@eye/game-engine";
import {
  Application,
  Assets,
  BlurFilter,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Text
} from "pixi.js";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getFloatingTextAlpha,
  shouldSuppressBoardDropAnimation
} from "@/lib/presentation/board-animation-rules";
import { ParticleSystem } from "@/lib/presentation/particle-system";
import {
  type SpinPresentationTimings,
  type SpinPhase
} from "@/lib/presentation/spin-state-machine";
import type {
  SpinChoreographyEvent,
  SpinChoreographyRun
} from "@/lib/presentation/spin-choreography";

const rows = 5;
const cols = 6;
const cellWidth = 110;
const cellHeight = 110;
const gap = 10;
const boardOffsetX = 28;
const boardOffsetY = 28;
const logicalWidth = cols * cellWidth + (cols - 1) * gap + 56;
const logicalHeight = rows * cellHeight + (rows - 1) * gap + 56;

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

// No overshoot — used for CASCADE drops so symbols settle without bouncing.
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

const symbolPalette: Record<SymbolId, { fill: number; accent: number }> = {
  ashen_sigil: { fill: 0x2b1e24, accent: 0xdfc89a },
  broken_halo: { fill: 0x32232b, accent: 0xf2d37e },
  ritual_dagger: { fill: 0x331d22, accent: 0xe9b466 },
  sealed_scroll: { fill: 0x35251f, accent: 0xe8c88c },
  seraphim_feather: { fill: 0x2c2738, accent: 0xead8a2 },
  burning_crown: { fill: 0x411e20, accent: 0xf0a948 },
  ophidian_relic: { fill: 0x20312d, accent: 0xa9dbb0 },
  celestial_gate: { fill: 0x202d3d, accent: 0x8ed3ff },
  seraphim_eye: { fill: 0x4a1f23, accent: 0xf8edd9 },
  samsara: { fill: 0x3a2238, accent: 0xd0a6ff },
  ouroboros: { fill: 0x28351e, accent: 0xc9f07a },
  panepoptis_ophthalmos: { fill: 0x422e16, accent: 0xf0ca72 },
  wild: { fill: 0x602a2f, accent: 0xffefbc }
};

const symbolLabels: Record<SymbolId, string> = {
  ashen_sigil: "Ashen Sigil",
  broken_halo: "Broken Halo",
  ritual_dagger: "Ritual Dagger",
  sealed_scroll: "Sealed Scroll",
  seraphim_feather: "Seraphim Feather",
  burning_crown: "Burning Crown",
  ophidian_relic: "Ophidian Relic",
  celestial_gate: "Celestial Gate",
  seraphim_eye: "Seraphim Eye",
  samsara: "Samsara",
  ouroboros: "Ouroboros",
  panepoptis_ophthalmos: "Panepoptis Ophthalmos",
  wild: "Wild"
};

type CellSprite = {
  container: Container;
  tile: Graphics;
  iconFallback: Graphics;
  iconSprite: Sprite;
  glow: Graphics;
  baseX: number;
  targetY: number;
  startY: number;
  animStart: number;
  animDuration: number;
  animating: boolean;
  useSettleEasing: boolean;
  hovered: boolean;
  highlighted: boolean;
  pulseUntil: number;
  crackStart: number;
  crackDuration: number;
  breakStart: number;
  breakDuration: number;
  breathingSeed: number;
  row: number;
  col: number;
};

const symbolPresentation: Record<
  SymbolId,
  { fit: number; offsetY?: number; fallbackScale?: number }
> = {
  ashen_sigil: { fit: 1.34, fallbackScale: 1.26 },
  broken_halo: { fit: 1.28, fallbackScale: 1.2 },
  ritual_dagger: { fit: 1.26, offsetY: -2, fallbackScale: 1.18 },
  sealed_scroll: { fit: 1.18, fallbackScale: 1.12 },
  seraphim_feather: { fit: 1.24, offsetY: -2, fallbackScale: 1.16 },
  burning_crown: { fit: 1.22, offsetY: -1, fallbackScale: 1.14 },
  ophidian_relic: { fit: 1.22, fallbackScale: 1.14 },
  celestial_gate: { fit: 1.18, fallbackScale: 1.12 },
  seraphim_eye: { fit: 1.24, fallbackScale: 1.16 },
  samsara: { fit: 1.18, fallbackScale: 1.12 },
  ouroboros: { fit: 1.2, fallbackScale: 1.14 },
  panepoptis_ophthalmos: { fit: 1.2, fallbackScale: 1.14 },
  wild: { fit: 1.2, fallbackScale: 1.14 }
};

type DriftSprite = {
  node: Graphics;
  baseX: number;
  baseY: number;
  seed: number;
};

type Props = {
  board: SymbolId[][];
  result: SpinResult | null;
  spinPhase: SpinPhase;
  phaseMessage: string;
  bonusActive: boolean;
  choreographyRun: SpinChoreographyRun | null;
  onChoreographySound?: (event: SpinChoreographyEvent) => void;
  presentationTimings: SpinPresentationTimings;
  floatingTextHoldMs: number;
  floatingTextFadeMs: number;
  symbolAssetSources: Record<SymbolId, readonly string[]>;
};

const drawSymbolIcon = (graphics: Graphics, symbol: SymbolId, accent: number) => {
  graphics.clear();
  graphics.circle(60, 60, 44).fill({ color: 0x050507, alpha: 0.24 });
  graphics.circle(60, 60, 42).stroke({ color: accent, width: 2, alpha: 0.36 });

  switch (symbol) {
    case "ashen_sigil":
      graphics.moveTo(40, 28).lineTo(60, 50).lineTo(82, 28).lineTo(60, 72).lineTo(40, 28);
      break;
    case "broken_halo":
      graphics.arc(60, 58, 24, 0.35, Math.PI * 1.75);
      break;
    case "ritual_dagger":
      graphics.moveTo(60, 22).lineTo(76, 52).lineTo(60, 48).lineTo(44, 52).lineTo(60, 22);
      graphics.moveTo(60, 48).lineTo(60, 92);
      break;
    case "sealed_scroll":
      graphics.roundRect(34, 28, 52, 56, 14);
      graphics.moveTo(42, 44).lineTo(78, 44);
      graphics.moveTo(42, 58).lineTo(74, 58);
      break;
    case "seraphim_feather":
      graphics.moveTo(50, 28).quadraticCurveTo(84, 42, 62, 92).moveTo(50, 28).lineTo(46, 88);
      break;
    case "burning_crown":
      graphics.moveTo(34, 72).lineTo(42, 40).lineTo(58, 58).lineTo(76, 34).lineTo(86, 72).lineTo(34, 72);
      break;
    case "ophidian_relic":
      graphics.moveTo(44, 34).quadraticCurveTo(86, 44, 56, 76).quadraticCurveTo(44, 86, 76, 94);
      break;
    case "celestial_gate":
      graphics.roundRect(34, 28, 52, 58, 24);
      graphics.moveTo(60, 28).lineTo(60, 86);
      break;
    case "seraphim_eye":
      graphics.ellipse(60, 60, 30, 18);
      graphics.circle(60, 60, 8);
      break;
    case "samsara":
      graphics.circle(60, 60, 24);
      graphics.moveTo(60, 36).quadraticCurveTo(46, 44, 54, 60).quadraticCurveTo(64, 74, 48, 84);
      break;
    case "ouroboros":
      graphics.circle(60, 60, 24);
      graphics.moveTo(74, 42).lineTo(84, 34).lineTo(82, 48);
      break;
    case "panepoptis_ophthalmos":
      graphics.ellipse(60, 60, 34, 22);
      graphics.circle(60, 60, 10);
      graphics.circle(60, 60, 28);
      break;
    case "wild":
      graphics.star(60, 60, 6, 30, 14, Math.PI / 6);
      break;
  }

  graphics.stroke({ color: accent, width: 4, alpha: 0.92, cap: "round", join: "round" });
  graphics.circle(60, 60, 3).fill({ color: accent, alpha: 0.62 });
};

const getCellCenter = (row: number, col: number) => ({
  x: boardOffsetX + col * (cellWidth + gap) + cellWidth / 2,
  y: boardOffsetY + row * (cellHeight + gap) + cellHeight / 2
});

const CASCADE_WAVE_COLUMN_DELAY_MS = 26;
const CASCADE_WAVE_LIFT_PX = 5;
const PRE_BREAK_FLASH_COUNT = 3;
const SPIN_DROP_COLUMN_DELAY_MS = 24;
const SPIN_DROP_DISTANCE_PX = 240;
const CASCADE_DROP_DISTANCE_PX = 100;
const SYMBOL_TEXTURE_LOAD_ATTEMPTS = 3;
const SYMBOL_TEXTURE_RETRY_DELAY_MS = 250;
const SYMBOL_TEXTURE_BUNDLE_PREFIX = "eye-symbol";
const MAX_RENDER_DPR = 2;
const HIGH_QUALITY_PARTICLE_COUNT = 140;
const LOW_QUALITY_PARTICLE_COUNT = 80;
const registeredSymbolTextureBundles = new Set<string>();

type PaintBoardOptions = {
  allowWave?: boolean;
  allowMotion?: boolean;
};

type SymbolTexture = Sprite["texture"];
type SymbolTextureEntry = readonly [SymbolId, SymbolTexture | null];

const waitForSymbolTextureRetry = (delayMs: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayMs);
  });

const symbolTextureAlias = (symbol: SymbolId, sourceIndex: number, url: string) => {
  const quality = url.includes("/assets/lite/") ? "low" : "high";

  return `${SYMBOL_TEXTURE_BUNDLE_PREFIX}:${quality}:${symbol}:${sourceIndex}`;
};

const loadSymbolTextureSource = async (
  alias: string,
  url: string
): Promise<SymbolTexture | null> => {
  const bundleId = `${alias}:bundle`;
  const resolver = Assets.resolver as unknown as {
    hasKey?: (key: string) => boolean;
  };
  const aliasAlreadyRegistered = Boolean(resolver.hasKey?.(alias));

  if (!registeredSymbolTextureBundles.has(bundleId) && !aliasAlreadyRegistered) {
    Assets.addBundle(bundleId, { [alias]: url });
    registeredSymbolTextureBundles.add(bundleId);
  }

  for (let attempt = 1; attempt <= SYMBOL_TEXTURE_LOAD_ATTEMPTS; attempt += 1) {
    try {
      const texture = aliasAlreadyRegistered
        ? await Assets.load<SymbolTexture>(alias)
        : ((await Assets.loadBundle(bundleId)) as Record<string, SymbolTexture | undefined>)[alias] ??
          (await Assets.load<SymbolTexture>(alias));

      if (texture && texture.width > 0 && texture.height > 0) {
        return texture;
      }
    } catch {
      // retry below before allowing the next source to be considered
    }

    if (attempt < SYMBOL_TEXTURE_LOAD_ATTEMPTS) {
      await waitForSymbolTextureRetry(SYMBOL_TEXTURE_RETRY_DELAY_MS);
    }
  }

  return null;
};

const loadSymbolTextureWithFallback = async (
  symbol: SymbolId,
  urls: readonly string[]
): Promise<SymbolTextureEntry> => {
  for (let sourceIndex = 0; sourceIndex < urls.length; sourceIndex += 1) {
    const url = urls[sourceIndex];
    const texture = await loadSymbolTextureSource(
      symbolTextureAlias(symbol, sourceIndex, url),
      url
    );

    if (texture) {
      return [symbol, texture] as const;
    }
  }

  return [symbol, null] as const;
};

export function PixiTempleBoard({
  board,
  result,
  spinPhase,
  phaseMessage,
  bonusActive,
  choreographyRun,
  onChoreographySound,
  presentationTimings,
  floatingTextHoldMs,
  floatingTextFadeMs,
  symbolAssetSources
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const rootRef = useRef<Container | null>(null);
  const symbolTexturesRef = useRef<Partial<Record<SymbolId, Sprite["texture"]>>>({});
  const overlayRef = useRef<Graphics | null>(null);
  const lightningRef = useRef<Graphics | null>(null);
  const bonusBeamsRef = useRef<Graphics | null>(null);
  const runeLayerRef = useRef<Graphics | null>(null);
  const winPathRef = useRef<Graphics | null>(null);
  const backgroundLayerRef = useRef<Container | null>(null);
  const floatingTextsRef = useRef<Text[]>([]);
  const floatingTextLayerRef = useRef<Container | null>(null);
  const cellRefs = useRef<CellSprite[]>([]);
  const cloudRefs = useRef<DriftSprite[]>([]);
  const eyeRefs = useRef<DriftSprite[]>([]);
  const moteRefs = useRef<DriftSprite[]>([]);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const phaseRef = useRef<SpinPhase>(spinPhase);
  const bonusActiveRef = useRef<boolean>(bonusActive);
  const highlightedWinsRef = useRef<CascadeWin[]>([]);
  const highlightStartRef = useRef(0);
  const nextLightningFlashRef = useRef(2600);
  const lightningUntilRef = useRef(0);
  const bonusFlashUntilRef = useRef(0);
  const bigWinUntilRef = useRef(0);
  const guidanceUntilRef = useRef(0);
  const lossVeilUntilRef = useRef(0);
  const timeoutsRef = useRef<number[]>([]);
  // When true, paintBoardCells places cells at their target position without drop animation.
  // Used for cascade.boardBefore updates which are same-frame redraws, not new-symbol drops.
  const suppressDropAnimationRef = useRef(false);
  const shouldResetSuppressAfterPaintRef = useRef(false);
  const activeBoardDropDurationRef = useRef<number | null>(null);
  const activeCascadeDropDurationRef = useRef<number | null>(null);
  const pendingCascadeWaveRef = useRef(false);
  const isWavingRef = useRef(false);
  const waveUnlockTimerRef = useRef<number | null>(null);
  const lastPresentedRoundIdRef = useRef<string | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [displayBoard, setDisplayBoard] = useState(board);
  const [highlightedCells, setHighlightedCells] = useState<{ row: number; col: number }[]>([]);
  const [hoveredSymbol, setHoveredSymbol] = useState<{ label: string; x: number; y: number } | null>(null);
  const [texturesReady, setTexturesReady] = useState(false);
  const displayBoardRef = useRef(displayBoard);
  const onChoreographySoundRef = useRef(onChoreographySound);

  useEffect(() => {
    onChoreographySoundRef.current = onChoreographySound;
  }, [onChoreographySound]);

  const safeDestroyApplication = useCallback((target: Application | null) => {
    if (!target) {
      return;
    }

    try {
      // Critical: stop the ticker before destroying the stage so no render loop
      // can read partially torn-down objects.
      target.ticker?.stop();

      // React dev mode can unmount while Pixi internals are only partially
      // initialized. Pixi Application.destroy expects both stage and renderer.
      const maybeTarget = target as unknown as {
        renderer?: { destroy?: (options?: unknown) => void };
        stage?: { destroy?: (options?: unknown) => void };
      };
      if (
        typeof maybeTarget.stage?.destroy === "function" &&
        typeof maybeTarget.renderer?.destroy === "function"
      ) {
        target.destroy({ removeView: true }, { children: true });
      }
    } catch {
      // Cleanup races during unmount are intentionally ignored. Runtime render
      // errors still surface through the active Pixi loop.
    }
  }, []);

  const applySymbolTexture = (cell: CellSprite, symbol: SymbolId, accent: number) => {
    const texture = symbolTexturesRef.current[symbol];
    const presentation = symbolPresentation[symbol];

    if (!texture) {
      cell.iconSprite.visible = false;
      cell.iconSprite.alpha = 0;
      cell.iconFallback.visible = true;
      cell.iconFallback.alpha = 0.96;
      cell.iconFallback.rotation = 0;
      drawSymbolIcon(cell.iconFallback, symbol, accent);
      cell.iconFallback.scale.set(presentation.fallbackScale ?? presentation.fit);
      cell.iconFallback.position.set(cellWidth / 2, cellHeight / 2 + (presentation.offsetY ?? 0));
      return;
    }

    const maxSize = 96;
    const baseScale = Math.min(maxSize / texture.width, maxSize / texture.height);
    const scale = baseScale * presentation.fit;

    cell.iconFallback.clear();
    cell.iconFallback.visible = false;
    cell.iconFallback.alpha = 0;
    cell.iconSprite.visible = true;
    cell.iconSprite.texture = texture;
    cell.iconSprite.width = texture.width * scale;
    cell.iconSprite.height = texture.height * scale;
    cell.iconSprite.x = cellWidth / 2;
    cell.iconSprite.y = cellHeight / 2 + (presentation.offsetY ?? 0);
    cell.iconSprite.alpha = 0.98;
  };

  useEffect(() => {
    phaseRef.current = spinPhase;
  }, [spinPhase]);

  useEffect(() => {
    bonusActiveRef.current = bonusActive;
  }, [bonusActive]);

  useEffect(() => {
    displayBoardRef.current = displayBoard;
  }, [displayBoard]);

  useEffect(() => {
    if (spinPhase !== "IDLE" && spinPhase !== "ROUND_END") {
      setHoveredSymbol(null);
    }
  }, [spinPhase]);

  const clearFloatingTexts = () => {
    // Remove all floating text objects from the layer and destroy them
    floatingTextsRef.current.forEach((text) => {
      if (text.parent) {
        text.parent.removeChild(text);
      }
      text.destroy();
    });
    floatingTextsRef.current = [];

    // Explicitly clear layer children to prevent orphaned display objects
    if (floatingTextLayerRef.current) {
      floatingTextLayerRef.current.removeChildren();
    }
  };

  const markWinningCells = (wins: CascadeWin[]) => {
    const cells = wins.flatMap((win) => win.cells);
    highlightedWinsRef.current = wins;
    highlightStartRef.current = performance.now();
    setHighlightedCells(cells);

    // give winning tiles a pulse window before removal
    cells.forEach((cell) => {
      const sprite = cellRefs.current[cell.row * cols + cell.col];
      if (sprite) {
        sprite.highlighted = true;
        sprite.pulseUntil = performance.now() + presentationTimings.winHighlight;
      }
    });
  };

  const clearWinningCells = () => {
    highlightedWinsRef.current = [];
    setHighlightedCells([]);
    cellRefs.current.forEach((cell) => {
      cell.highlighted = false;
      cell.pulseUntil = 0;
    });
  };

  const clearBreakingCells = () => {
    cellRefs.current.forEach((cell) => {
      cell.crackStart = 0;
      cell.crackDuration = 0;
      cell.breakStart = 0;
      cell.breakDuration = 0;
    });
  };

  const startCrackingCells = (wins: CascadeWin[], durationMs: number) => {
    const cells = wins.flatMap((win) => win.cells);
    const now = performance.now();
    const duration = Math.max(48, durationMs);

    cells.forEach((cell) => {
      const sprite = cellRefs.current[cell.row * cols + cell.col];
      if (sprite) {
        sprite.crackStart = now;
        sprite.crackDuration = duration;
      }
    });
  };

  const startBreakingCells = (wins: CascadeWin[], durationMs: number) => {
    const cells = wins.flatMap((win) => win.cells);
    const now = performance.now();
    const duration = Math.max(48, durationMs);

    cells.forEach((cell) => {
      const sprite = cellRefs.current[cell.row * cols + cell.col];
      if (sprite) {
        sprite.breakStart = now;
        sprite.breakDuration = duration;
      }
    });
  };

  const emitWinParticles = (wins: CascadeWin[]) => {
    const particleSystem = particleSystemRef.current;
    if (!particleSystem) {
      return;
    }

    wins.forEach((win) => {
      win.cells.forEach((cell) => {
        const center = getCellCenter(cell.row, cell.col);

        // combine ash, sparks, and dust for dissolve effect
        particleSystem.spawnBurst({ ...center, count: 5, kind: "ash", spread: 18, speed: 1.6, life: 420 });
        particleSystem.spawnBurst({ ...center, count: 4, kind: "gold_dust", spread: 24, speed: 1.8, life: 540 });
        particleSystem.spawnBurst({ ...center, count: 3, kind: "spark", spread: 16, speed: 2.4, life: 280 });
      });
    });
  };

  const emitBonusBurst = () => {
    const particleSystem = particleSystemRef.current;
    if (!particleSystem) {
      return;
    }

    particleSystem.spawnBurst({
      x: logicalWidth / 2,
      y: logicalHeight / 2 - 10,
      count: 18,
      kind: "bonus",
      spread: 180,
      speed: 2.6,
      life: 760
    });
  };

  const drawWinPaths = (graphics: Graphics, wins: CascadeWin[], now: number) => {
    graphics.clear();

    if (wins.length === 0) {
      return;
    }

    const elapsed = Math.max(0, now - highlightStartRef.current);
    const highlightDuration = Math.max(1, presentationTimings.winHighlight);
    const progress = Math.min(1, elapsed / highlightDuration);
    const flashPhase = progress * PRE_BREAK_FLASH_COUNT * Math.PI;
    const pulse = 0.52 + Math.abs(Math.sin(flashPhase)) * 0.52;

    wins.forEach((win) => {
      const cellMap = new Set(win.cells.map((cell) => `${cell.row}:${cell.col}`));

      graphics.stroke({
        color: 0xf0ca72,
        width: 12,
        alpha: 0.14 * pulse,
        cap: "round"
      });

      win.cells.forEach((cell) => {
        const center = getCellCenter(cell.row, cell.col);
        graphics.circle(center.x, center.y, 22);
      });

      graphics.stroke({
        color: 0xf8edd9,
        width: 4,
        alpha: 0.7 + pulse * 0.18,
        cap: "round"
      });

      win.cells.forEach((cell) => {
        const source = getCellCenter(cell.row, cell.col);

        [
          { row: cell.row, col: cell.col + 1 },
          { row: cell.row + 1, col: cell.col }
        ].forEach((neighbor) => {
          if (!cellMap.has(`${neighbor.row}:${neighbor.col}`)) {
            return;
          }

          const target = getCellCenter(neighbor.row, neighbor.col);
          graphics.moveTo(source.x, source.y);
          graphics.lineTo(target.x, target.y);
        });
      });
    });
  };

  const drawRuneLayer = (graphics: Graphics, now: number) => {
    graphics.clear();

    // Board-frame debugging result:
    // This Pixi rune layer draws the inner rounded rectangle plus the small corner strokes.
    // In screenshot review this was the visually intrusive "green/inset" frame, not the CSS shell
    // and not the heavier Pixi canvas frame. We intentionally keep the drawing code in place with
    // alpha 0 so the layer remains easy to re-enable for future art direction tests.
    const alpha = 0;

    graphics.stroke({ color: 0xf0ca72, width: 2, alpha });
    graphics.roundRect(boardOffsetX - 16, boardOffsetY - 16, logicalWidth - 48, logicalHeight - 56, 26);

    graphics.stroke({ color: 0xf0ca72, width: 1.5, alpha: alpha * 1.3 });
    graphics.moveTo(boardOffsetX + 24, boardOffsetY - 2);
    graphics.lineTo(boardOffsetX + 82, boardOffsetY - 2);
    graphics.moveTo(boardOffsetX + 24, logicalHeight - 28);
    graphics.lineTo(boardOffsetX + 82, logicalHeight - 28);
    graphics.moveTo(logicalWidth - 130, boardOffsetY - 2);
    graphics.lineTo(logicalWidth - 72, boardOffsetY - 2);
    graphics.moveTo(logicalWidth - 130, logicalHeight - 28);
    graphics.lineTo(logicalWidth - 72, logicalHeight - 28);
  };

  const queueFloatingText = (
    _root: Container,
    text: string,
    x: number,
    y: number,
    size: number,
    color: number
  ) => {
    const layer = floatingTextLayerRef.current;
    if (!layer) {
      return;
    }

    const node = new Text({
      text,
      style: {
        fill: color,
        fontSize: size,
        fontWeight: "700",
        fontFamily: "Georgia"
      }
    });

    node.anchor.set(0.5);
    node.x = x;
    node.y = y;
    (node as any).createdAt = performance.now();
    layer.addChild(node);
    floatingTextsRef.current.push(node);
  };

  const paintBoardCells = useCallback((options?: PaintBoardOptions) => {
    const app = appRef.current;
    if (!app || cellRefs.current.length === 0) {
      return false;
    }

    const phase = phaseRef.current;
    const allowWave = options?.allowWave ?? true;
    const allowMotion = options?.allowMotion ?? true;
    const shouldStartCascadeWave =
      allowMotion &&
      allowWave &&
      phase === "CASCADE" &&
      pendingCascadeWaveRef.current &&
      !suppressDropAnimationRef.current &&
      !isWavingRef.current;
    const cascadeDropDurationMs = Math.max(
      140,
      activeCascadeDropDurationRef.current ?? Math.round(presentationTimings.cascadeDrop * 0.72)
    );
    const spinDropDurationMs = Math.max(
      180,
      activeBoardDropDurationRef.current ?? presentationTimings.boardDrop
    );
    const spinStartAnticipationMs = phase === "SPIN_START" ? presentationTimings.spinStart : 0;

    if (shouldStartCascadeWave) {
      pendingCascadeWaveRef.current = false;
      isWavingRef.current = true;

      if (waveUnlockTimerRef.current !== null) {
        window.clearTimeout(waveUnlockTimerRef.current);
      }

      waveUnlockTimerRef.current = window.setTimeout(() => {
        isWavingRef.current = false;
        waveUnlockTimerRef.current = null;
      }, cascadeDropDurationMs + (cols - 1) * CASCADE_WAVE_COLUMN_DELAY_MS + 40);
    }

    // sync visible tiles with the latest resolved board state
    displayBoardRef.current.forEach((row, rowIndex) => {
      row.forEach((symbol, colIndex) => {
        const cell = cellRefs.current[rowIndex * cols + colIndex];
        if (!cell) {
          return;
        }

        const palette = symbolPalette[symbol];
        const dropDistance =
          phase === "CASCADE"
            ? CASCADE_DROP_DISTANCE_PX
            : phase === "SPIN_START"
              ? SPIN_DROP_DISTANCE_PX
              : 120;

        cell.tile.clear();
        cell.tile.roundRect(0, 0, cellWidth, cellHeight, 22).fill({
          color: palette.fill,
          alpha: 0.96
        });
        cell.tile.roundRect(0, 0, cellWidth, cellHeight, 22).stroke({
          color: cell.highlighted ? 0xf0ca72 : palette.accent,
          alpha: cell.highlighted ? 0.95 : 0.3,
          width: cell.highlighted ? 4 : 2
        });

        cell.glow.clear();
        cell.glow.roundRect(-4, -4, cellWidth + 8, cellHeight + 8, 26).fill({
          color: cell.highlighted ? 0xf0ca72 : palette.accent,
          alpha: 0.18
        });

        applySymbolTexture(cell, symbol, palette.accent);

        if (!allowMotion) {
          return;
        }

        if (suppressDropAnimationRef.current) {
          // No drop — place cell directly at target without animation.
          cell.animating = false;
        } else {
          const waveLift = shouldStartCascadeWave ? CASCADE_WAVE_LIFT_PX : 0;
          cell.startY = cell.targetY - dropDistance - waveLift;
          const columnDelayMs = shouldStartCascadeWave
            ? colIndex * CASCADE_WAVE_COLUMN_DELAY_MS
            : colIndex * SPIN_DROP_COLUMN_DELAY_MS;
          cell.animStart =
            app.ticker.lastTime +
            spinStartAnticipationMs +
            columnDelayMs;
          cell.animDuration = shouldStartCascadeWave ? cascadeDropDurationMs : spinDropDurationMs;
          cell.useSettleEasing = !shouldStartCascadeWave;
          cell.animating = true;
        }
      });
    });

    return true;
  }, [presentationTimings.boardDrop, presentationTimings.cascadeDrop, presentationTimings.spinStart]);

  // Stable ref to the latest paintBoardCells. The Pixi init effect repaints through
  // this ref WITHOUT listing paintBoardCells as a dependency, so a spin-speed /
  // presentationTimings change no longer tears down and rebuilds the whole Pixi
  // Application (the teardown raced and threw "Cannot read properties of null").
  const paintBoardCellsRef = useRef(paintBoardCells);
  useEffect(() => {
    paintBoardCellsRef.current = paintBoardCells;
  }, [paintBoardCells]);

  useEffect(() => {
    if (shouldSuppressBoardDropAnimation(board, spinPhase)) {
      suppressDropAnimationRef.current = true;
      shouldResetSuppressAfterPaintRef.current = true;
    }

    setDisplayBoard(board);
  }, [board]);

  useEffect(() => {
    timeoutsRef.current.forEach((timer) => window.clearTimeout(timer));
    timeoutsRef.current = [];

    if (!result || result.cascades.length === 0) {
      pendingCascadeWaveRef.current = false;
      isWavingRef.current = false;
      activeBoardDropDurationRef.current = null;
      activeCascadeDropDurationRef.current = null;
      if (waveUnlockTimerRef.current !== null) {
        window.clearTimeout(waveUnlockTimerRef.current);
        waveUnlockTimerRef.current = null;
      }

      if (shouldSuppressBoardDropAnimation(board, spinPhase)) {
        suppressDropAnimationRef.current = true;
        shouldResetSuppressAfterPaintRef.current = true;
      }

      setDisplayBoard(board);
      clearWinningCells();
      clearBreakingCells();
      if (result?.bonusTriggered) {
        bonusFlashUntilRef.current = performance.now() + presentationTimings.bonusTrigger;
        emitBonusBurst();
      }
      return;
    }

    if (result.bonusTriggered) {
      bonusFlashUntilRef.current = performance.now() + presentationTimings.bonusTrigger;
      emitBonusBurst();
    }

    if (result.totalWin >= result.bet * 5) {
      bigWinUntilRef.current = performance.now() + 1100;
    }

    if (result.totalWin > 0) {
      guidanceUntilRef.current =
        performance.now() +
        Math.max(
          900,
          choreographyRun?.runId === result.roundSummary.roundId
            ? choreographyRun.summaryAtMs
            : presentationTimings.boardDrop + presentationTimings.winHighlight + presentationTimings.cascadeDrop + 220
        );
      lossVeilUntilRef.current = 0;
    } else if (!result.bonusTriggered) {
      lossVeilUntilRef.current = performance.now() + 700;
      guidanceUntilRef.current = 0;
    }

    const queueCascadePayoutText = (
      cascade: SpinResult["cascades"][number],
      event?: SpinChoreographyEvent
    ) => {
      if (cascade.stepWin <= 0) {
        return;
      }

      const root = rootRef.current;
      if (!root) {
        return;
      }

      const winCells = cascade.wins.flatMap((win) => win.cells);
      let spawnX = logicalWidth / 2;
      let spawnY = logicalHeight / 2;
      if (winCells.length > 0) {
        const avgRow = winCells.reduce((acc, cell) => acc + cell.row, 0) / winCells.length;
        const avgCol = winCells.reduce((acc, cell) => acc + cell.col, 0) / winCells.length;
        spawnX = boardOffsetX + avgCol * (cellWidth + gap) + cellWidth / 2;
        spawnY = boardOffsetY + avgRow * (cellHeight + gap) + cellHeight / 2 - 20;
      }

      const isBig = cascade.stepWin >= result.bet * 5;
      queueFloatingText(
        root,
        `+${formatMoney(cascade.stepWin)}`,
        spawnX,
        spawnY - 60,
        isBig ? 32 : 22,
        0xf8edd9
      );

      if (result.cascades.length > 1 && event?.runningWin !== undefined) {
        queueFloatingText(
          root,
          `TOTAL ${formatMoney(event.runningWin)}`,
          logicalWidth / 2,
          boardOffsetY + 8,
          isBig ? 24 : 18,
          0xf0ca72
        );
      }
    };

    const activeChoreography =
      choreographyRun?.runId === result.roundSummary.roundId ? choreographyRun : null;

    if (activeChoreography) {
      const firstCascade = result.cascades[0];
      activeBoardDropDurationRef.current =
        activeChoreography.events.find((event) => event.type === "board_drop")?.durationMs ?? null;
      activeCascadeDropDurationRef.current = null;
      setDisplayBoard(firstCascade.boardBefore);
      clearWinningCells();
      clearBreakingCells();

      const boardEvents = activeChoreography.events
        .filter((event) => event.cascadeIndex !== undefined)
        .sort((left, right) => left.atMs - right.atMs);
      const runStartedAt = performance.now();
      let nextEventIndex = 0;
      let frameId = 0;

      const applyBoardEvent = (event: SpinChoreographyEvent) => {
        const cascadeIndex = event.cascadeIndex;
        if (cascadeIndex === undefined) {
          return;
        }

        const cascade = result.cascades[cascadeIndex];
        if (!cascade) {
          return;
        }

        switch (event.type) {
          case "board_drop":
            activeBoardDropDurationRef.current = event.durationMs;
            if (event.cascadeIndex !== 0) {
              suppressDropAnimationRef.current = true;
              shouldResetSuppressAfterPaintRef.current = true;
            }
            setDisplayBoard(cascade.boardBefore);
            clearWinningCells();
            clearBreakingCells();
            onChoreographySoundRef.current?.(event);
            return;
          case "win_scan":
            markWinningCells(cascade.wins);
            onChoreographySoundRef.current?.(event);
            return;
          case "symbol_prebreak":
            markWinningCells(cascade.wins);
            startCrackingCells(cascade.wins, event.durationMs);
            onChoreographySoundRef.current?.(event);
            return;
          case "symbol_break":
            startBreakingCells(cascade.wins, event.durationMs);
            onChoreographySoundRef.current?.(event);
            emitWinParticles(cascade.wins);
            return;
          case "cascade_payout":
            queueCascadePayoutText(cascade, event);
            onChoreographySoundRef.current?.(event);
            return;
          case "cascade_drop":
            activeCascadeDropDurationRef.current = event.durationMs;
            clearWinningCells();
            clearBreakingCells();
            pendingCascadeWaveRef.current = true;
            onChoreographySoundRef.current?.(event);
            setDisplayBoard(cascade.boardAfter);
            return;
        }
      };

      const runBoardEvents = (now: number) => {
        const elapsed = now - runStartedAt;

        while (
          nextEventIndex < boardEvents.length &&
          elapsed >= boardEvents[nextEventIndex].atMs
        ) {
          applyBoardEvent(boardEvents[nextEventIndex]);
          nextEventIndex += 1;
        }

        if (nextEventIndex < boardEvents.length) {
          frameId = window.requestAnimationFrame(runBoardEvents);
        }
      };

      frameId = window.requestAnimationFrame(runBoardEvents);

      return () => {
        window.cancelAnimationFrame(frameId);
        timeoutsRef.current.forEach((timer) => window.clearTimeout(timer));
        timeoutsRef.current = [];
      };
    }

    let cursor = 0;
    result.cascades.forEach((cascade) => {
      timeoutsRef.current.push(
        window.setTimeout(() => {
          // boardBefore is a redraw of the current visible state — no drop animation needed.
          suppressDropAnimationRef.current = true;
          shouldResetSuppressAfterPaintRef.current = true;
          setDisplayBoard(cascade.boardBefore);
          clearWinningCells();
        }, cursor)
      );

      timeoutsRef.current.push(
        window.setTimeout(() => {
          markWinningCells(cascade.wins);
        }, cursor + presentationTimings.boardDrop)
      );

      timeoutsRef.current.push(
        window.setTimeout(() => {
          emitWinParticles(cascade.wins);

          // Emit per-cascade win amount near the winning cells centroid.
          if (cascade.stepWin > 0) {
            const root = rootRef.current;
            if (root) {
              const winCells = cascade.wins.flatMap((w) => w.cells);
              let spawnX = logicalWidth / 2;
              let spawnY = logicalHeight / 2;
              if (winCells.length > 0) {
                const avgRow = winCells.reduce((acc, c) => acc + c.row, 0) / winCells.length;
                const avgCol = winCells.reduce((acc, c) => acc + c.col, 0) / winCells.length;
                spawnX = boardOffsetX + avgCol * (cellWidth + gap) + cellWidth / 2;
                spawnY = boardOffsetY + avgRow * (cellHeight + gap) + cellHeight / 2 - 20;
              }

              const isBig = cascade.stepWin >= result.bet * 5;
              queueFloatingText(root, `+${formatMoney(cascade.stepWin)}`, spawnX, spawnY - 60, isBig ? 32 : 22, 0xf8edd9);
            }
          }
        }, cursor + presentationTimings.boardDrop + presentationTimings.winHighlight - 80)
      );

      timeoutsRef.current.push(
        window.setTimeout(() => {
          clearWinningCells();
          pendingCascadeWaveRef.current = true;
          setDisplayBoard(cascade.boardAfter);
        }, cursor + presentationTimings.boardDrop + presentationTimings.winHighlight + 130)
      );

      cursor +=
        presentationTimings.boardDrop +
        presentationTimings.winHighlight +
        presentationTimings.cascadeDrop +
        110;
    });

    return () => {
      timeoutsRef.current.forEach((timer) => window.clearTimeout(timer));
      timeoutsRef.current = [];
    };
  }, [board, choreographyRun, result, spinPhase]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const app = new Application();
    appRef.current = app;
    let mounted = true;
    setTexturesReady(false);

    const resizeStage = () => {
      const currentHost = hostRef.current;
      const currentApp = appRef.current;
      const root = rootRef.current;
      if (!currentHost || !currentApp || !root) {
        return;
      }

      const width = Math.max(1, currentHost.clientWidth);
      const height = Math.max(1, currentHost.clientHeight);
      currentApp.renderer.resize(width, height);

      const scale = Math.min(width / logicalWidth, height / logicalHeight);
      root.scale.set(scale);
      root.x = (width - logicalWidth * scale) / 2;
      root.y = (height - logicalHeight * scale) / 2;
    };

    void (async () => {
      try {
        await app.init({
          width: logicalWidth,
          height: logicalHeight,
          backgroundAlpha: 0,
          antialias: true,
          resolution: Math.min(window.devicePixelRatio || 1, MAX_RENDER_DPR)
        });
        
        // Stop ticker immediately after init completes, before async operations
        // This prevents rendering the incomplete scene tree during asset loading
        app.ticker.stop();

        const textureEntries = await Promise.all(
          (Object.entries(symbolAssetSources) as [SymbolId, readonly string[]][]).map(
            ([symbol, urls]) => loadSymbolTextureWithFallback(symbol, urls)
          )
        );
        const particleCount = Object.values(symbolAssetSources).some(
          (sources) => sources[0]?.includes("/assets/lite/")
        )
          ? LOW_QUALITY_PARTICLE_COUNT
          : HIGH_QUALITY_PARTICLE_COUNT;

        symbolTexturesRef.current = textureEntries.reduce<Partial<Record<SymbolId, Sprite["texture"]>>>(
          (accumulator, [symbol, texture]) => {
            if (texture) {
              accumulator[symbol] = texture;
            }

            return accumulator;
          },
          {}
        );
        if (!mounted) {
          safeDestroyApplication(app);
          return;
        }

        setTexturesReady(true);

        host.innerHTML = "";
        host.appendChild(app.canvas);

        const root = new Container();
        root.sortableChildren = true;
        rootRef.current = root;
        app.stage.addChild(root);

      const backgroundLayer = new Container();
      backgroundLayer.zIndex = 0;
      backgroundLayerRef.current = backgroundLayer;
      root.addChild(backgroundLayer);

      const boardContainer = new Container();
      boardContainer.sortableChildren = true;
      boardContainer.zIndex = 10;
      boardContainer.x = boardOffsetX;
      boardContainer.y = boardOffsetY;
      root.addChild(boardContainer);

      const runeLayer = new Graphics();
      runeLayer.zIndex = 20;
      runeLayer.filters = [new BlurFilter({ strength: 1.2 })];
      runeLayerRef.current = runeLayer;
      root.addChild(runeLayer);

      const winPath = new Graphics();
      winPath.zIndex = 30;
      winPathRef.current = winPath;
      root.addChild(winPath);

      const particleSystem = new ParticleSystem(root, particleCount);
      particleSystem.container.zIndex = 32;
      particleSystemRef.current = particleSystem;

      const overlay = new Graphics();
      overlay.zIndex = 34;
      overlayRef.current = overlay;
      root.addChild(overlay);

      const bonusBeams = new Graphics();
      bonusBeams.zIndex = 35;
      bonusBeamsRef.current = bonusBeams;
      root.addChild(bonusBeams);

      const lightning = new Graphics();
      lightning.zIndex = 36;
      lightningRef.current = lightning;
      root.addChild(lightning);

      // Floating text layer must sit above ALL other layers so win amounts
      // and multiplier callouts are never occluded by the board or particles.
      const floatingTextLayer = new Container();
      floatingTextLayer.zIndex = 50;
      floatingTextLayerRef.current = floatingTextLayer;
      root.addChild(floatingTextLayer);

      const frame = new Graphics();
      frame.zIndex = 0;
      frame.roundRect(0, 0, logicalWidth - 24, logicalHeight - 24, 26).fill({
        color: 0x120d11,
        alpha: 0.34
      });
      frame.roundRect(0, 0, logicalWidth - 24, logicalHeight - 24, 26).stroke({
        color: 0xf0ca72,
        width: 2,
        alpha: 0.1
      });
      // This is the larger Pixi board frame.
      // During layer isolation it matched the outer/yellow frame, not the unwanted inset frame.
      // It stays active as part of the accepted board look.
      frame.alpha = 1;
      frame.x = -15;
      frame.y = -14;
      boardContainer.addChild(frame);

      const clouds: DriftSprite[] = [];
      for (let index = 0; index < 5; index += 1) {
        const node = new Graphics();
        node.ellipse(0, 0, 120 + index * 8, 30 + (index % 2) * 8).fill({
          color: index % 2 === 0 ? 0xf0ca72 : 0xffffff,
          alpha: 0.03
        });
        node.filters = [new BlurFilter({ strength: 18 })];
        node.x = 180 + index * 150;
        node.y = 60 + (index % 2) * 28;
        backgroundLayer.addChild(node);
        clouds.push({ node, baseX: node.x, baseY: node.y, seed: 0.7 + index });
      }
      cloudRefs.current = clouds;

      const eyes: DriftSprite[] = [];
      for (let index = 0; index < 2; index += 1) {
        const node = new Graphics();
        node.ellipse(0, 0, 58, 24).fill({ color: 0xf0ca72, alpha: 0.035 });
        node.circle(0, 0, 10).fill({ color: 0xf8edd9, alpha: 0.06 });
        node.x = 110 + index * 520;
        node.y = 38 + index * 14;
        node.filters = [new BlurFilter({ strength: 6 })];
        backgroundLayer.addChild(node);
        eyes.push({ node, baseX: node.x, baseY: node.y, seed: 2.1 + index });
      }
      eyeRefs.current = eyes;

      const motes: DriftSprite[] = [];
      for (let index = 0; index < 18; index += 1) {
        const node = new Graphics();
        node.circle(0, 0, 2 + (index % 3)).fill({
          color: index % 2 === 0 ? 0xf0ca72 : 0xf8edd9,
          alpha: 0.18
        });
        node.x = 90 + (index % 6) * 110;
        node.y = 46 + Math.floor(index / 6) * 52;
        backgroundLayer.addChild(node);
        motes.push({ node, baseX: node.x, baseY: node.y, seed: index * 0.5 });
      }
      moteRefs.current = motes;

      const cells: CellSprite[] = [];
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const container = new Container();
          const tile = new Graphics();
          const iconFallback = new Graphics();
          const iconSprite = new Sprite();
          const glow = new Graphics();
          const baseX = col * (cellWidth + gap);
          const targetY = row * (cellHeight + gap);

          container.x = baseX;
          container.y = targetY;
          container.zIndex = 10;
          container.eventMode = "static";
          container.cursor = "pointer";
          container.hitArea = new Rectangle(0, 0, cellWidth, cellHeight);
          iconFallback.pivot.set(60, 60);
          iconSprite.anchor.set(0.5);
          iconSprite.x = cellWidth / 2;
          iconSprite.y = cellHeight / 2;
          container.addChild(glow, tile, iconSprite, iconFallback);
          boardContainer.addChild(container);

          const cell: CellSprite = {
            container,
            tile,
            iconFallback,
            iconSprite,
            glow,
            baseX,
            targetY,
            startY: targetY - 140,
            animStart: 0,
            animDuration: 360,
            animating: false,
            useSettleEasing: true,
            hovered: false,
            highlighted: false,
            pulseUntil: 0,
            crackStart: 0,
            crackDuration: 0,
            breakStart: 0,
            breakDuration: 0,
            breathingSeed: Math.random() * Math.PI * 2,
            row,
            col
          };

          container.on("pointerover", (event) => {
            cell.hovered = true;

            const host = hostRef.current;
            const symbol = displayBoardRef.current[row]?.[col];
            if (!host || !symbol) {
              return;
            }

            const bounds = host.getBoundingClientRect();
            setHoveredSymbol({
              label: symbolLabels[symbol],
              x: event.clientX - bounds.left,
              y: event.clientY - bounds.top - 12
            });
            host.title = symbolLabels[symbol];
          });

          container.on("pointermove", (event) => {
            const host = hostRef.current;
            const symbol = displayBoardRef.current[row]?.[col];
            if (!host || !symbol) {
              return;
            }

            const bounds = host.getBoundingClientRect();
            setHoveredSymbol({
              label: symbolLabels[symbol],
              x: event.clientX - bounds.left,
              y: event.clientY - bounds.top - 12
            });
          });

          container.on("pointerout", () => {
            cell.hovered = false;
            setHoveredSymbol(null);

            if (hostRef.current) {
              hostRef.current.title = "";
            }
          });

          cells.push(cell);
        }
      }
      cellRefs.current = cells;

      const tickerListener = (ticker: any) => {
        // Guard: Exit immediately if component is unmounting or app is destroyed
        if (!mounted || !appRef.current || !rootRef.current) {
          return;
        }

        const now = ticker.lastTime;
        const deltaMs = ticker.deltaMS ?? 16.6667;

        if (now > nextLightningFlashRef.current) {
          lightningUntilRef.current = now + 240;
          nextLightningFlashRef.current = now + 4200 + ((Math.sin(now / 2300) + 1) * 0.5 + 0.2) * 5200;
        }

        cloudRefs.current.forEach((cloud, index) => {
          if (phaseRef.current === "CASCADE") {
            cloud.node.alpha = 0;
          } else {
            cloud.node.x = cloud.baseX + Math.sin(now / 1800 + cloud.seed) * (10 + index * 0.5);
            cloud.node.alpha = 0.025 + (Math.sin(now / 1400 + cloud.seed) + 1) * 0.014;
          }
        });

        eyeRefs.current.forEach((eye) => {
          if (phaseRef.current === "CASCADE") {
            eye.node.alpha = 0;
          } else {
            eye.node.x = eye.baseX + Math.sin(now / 2200 + eye.seed) * 12;
            eye.node.y = eye.baseY + Math.cos(now / 1700 + eye.seed) * 4;
            eye.node.alpha = 0.03 + (Math.sin(now / 1300 + eye.seed) + 1) * 0.012;
          }
        });

        moteRefs.current.forEach((mote) => {
          if (phaseRef.current === "CASCADE") {
            mote.node.alpha = 0;
          } else {
            mote.node.x = mote.baseX + Math.sin(now / 900 + mote.seed) * 10;
            mote.node.y = mote.baseY + Math.cos(now / 1100 + mote.seed) * 14;
            mote.node.alpha = 0.08 + (Math.sin(now / 700 + mote.seed) + 1) * 0.08;
          }
        });

        particleSystemRef.current?.update(deltaMs);

        // Safe floating text update: validate object still exists before accessing
        const validFloatingTexts: Text[] = [];
        for (const text of floatingTextsRef.current) {
          try {
            // Validate the text object is still in a valid state
            if (!text.destroyed && text.parent) {
              text.y -= 0.35;
              const createdAt = (text as any).createdAt ?? now;
              const elapsedMs = now - createdAt;
              text.alpha = getFloatingTextAlpha(elapsedMs, floatingTextHoldMs, floatingTextFadeMs);

              if (text.alpha <= 0) {
                text.destroy();
              } else {
                validFloatingTexts.push(text);
              }
            }
          } catch (error) {
            if (process.env.NODE_ENV === "development") {
              console.warn("[PixiTempleBoard] Error updating floating text:", error);
            }
          }
        }
        floatingTextsRef.current = validFloatingTexts;

        // Guard: Validate graphics layers exist before drawing
        if (runeLayerRef.current && !runeLayerRef.current.destroyed) {
          drawRuneLayer(runeLayerRef.current, now);
        }
        if (winPathRef.current && !winPathRef.current.destroyed) {
          drawWinPaths(winPathRef.current, highlightedWinsRef.current, now);
        }

        // Guard: Validate cell refs array and each cell's parent container
        if (!cellRefs.current || cellRefs.current.length === 0) {
          return;
        }

        cellRefs.current.forEach((cell) => {
          // Skip cells that have been destroyed or removed from scene graph
          if (!cell || !cell.container || cell.container.destroyed) {
            return;
          }
          const currentPhase = phaseRef.current;
          const idleMotionActive =
            currentPhase === "IDLE" && !cell.animating;
          const focusActive = currentPhase === "WIN_CHECK" && highlightedWinsRef.current.length > 0;
          const pulseActive = cell.highlighted && cell.pulseUntil > now;
          const progress = Math.min(1, Math.max(0, (now - cell.animStart) / cell.animDuration));
          const animating = cell.animating && now >= cell.animStart;
          const eased = cell.useSettleEasing ? easeOutBack(progress) : easeOutCubic(progress);
          const animatedY = animating
            ? cell.startY + (cell.targetY - cell.startY) * eased
            : cell.targetY;
          const shake = phaseRef.current === "SPIN_START"
            ? Math.sin(now / 18 + cell.row + cell.col * 0.6) * 1.6
            : 0;
          const shakeY = phaseRef.current === "SPIN_START"
            ? Math.cos(now / 22 + cell.col + cell.row * 0.4) * 1.2
            : 0;
          const breathing = idleMotionActive
            ? Math.sin(now / 880 + cell.breathingSeed) * 0.012
            : 0;
          const hoverBoost = idleMotionActive && cell.hovered ? 0.05 : 0;
          const focusBoost = pulseActive ? 0.05 + Math.sin(now / 80) * 0.018 : 0;
          const scale = 1 + breathing + hoverBoost + focusBoost;
          const animationAlpha = animating ? 0.38 + progress * 0.62 : 1;
          const focusAlpha = focusActive && !cell.highlighted ? 0.42 : 1;
          const crackActive =
            cell.crackDuration > 0 &&
            now >= cell.crackStart &&
            now <= cell.crackStart + cell.crackDuration;
          const crackProgress = crackActive
            ? Math.min(1, Math.max(0, (now - cell.crackStart) / cell.crackDuration))
            : 0;
          const breakActive =
            cell.breakDuration > 0 &&
            now >= cell.breakStart &&
            now <= cell.breakStart + cell.breakDuration;
          const breakProgress = breakActive
            ? Math.min(1, Math.max(0, (now - cell.breakStart) / cell.breakDuration))
            : 0;
          const breakEase = easeOutCubic(breakProgress);
          const breakAlpha = breakActive ? Math.max(0.08, 1 - breakEase * 0.94) : 1;
          const breakScale = breakActive ? 1 + Math.sin(breakProgress * Math.PI) * 0.18 : 1;
          const crackShake = crackActive ? Math.sin(now / 10 + cell.row * 1.6 + cell.col) * (1 - crackProgress) * 2.4 : 0;
          const crackShakeY = crackActive ? Math.cos(now / 11 + cell.col * 1.3) * (1 - crackProgress) * 1.8 : 0;
          const breakShake = breakActive ? Math.sin(now / 12 + cell.row * 1.7 + cell.col) * (1 - breakProgress) * 3.2 : 0;
          const breakShakeY = breakActive ? Math.cos(now / 13 + cell.col * 1.4) * (1 - breakProgress) * 2.4 : 0;

          cell.container.x = cell.baseX + shake + crackShake + breakShake;
          cell.container.y = animatedY + shakeY + crackShakeY + breakShakeY;
          cell.container.scale.set(scale * breakScale);
          cell.container.alpha = Math.min(animationAlpha, focusAlpha, breakAlpha);

          cell.glow.alpha =
            (cell.hovered ? 0.14 : 0.04) +
            (cell.highlighted ? (pulseActive ? 0.28 : 0.2) : 0) +
            (crackActive ? (1 - crackProgress) * 0.22 : 0) +
            (breakActive ? (1 - breakProgress) * 0.28 : 0);

          if (progress >= 1) {
            cell.animating = false;
          }

          if (cell.breakDuration > 0 && now > cell.breakStart + cell.breakDuration) {
            cell.breakStart = 0;
            cell.breakDuration = 0;
          }

          if (cell.crackDuration > 0 && now > cell.crackStart + cell.crackDuration) {
            cell.crackStart = 0;
            cell.crackDuration = 0;
          }
        });

        if (overlayRef.current && !overlayRef.current.destroyed) {
          overlayRef.current.clear();
          if (phaseRef.current === "SPIN_START") {
            overlayRef.current.rect(0, 0, logicalWidth, logicalHeight).fill({ color: 0xf0ca72, alpha: 0.04 });
          }

          if (phaseRef.current === "WIN_CHECK" && highlightedWinsRef.current.length > 0) {
            overlayRef.current.rect(0, 0, logicalWidth, logicalHeight).fill({
              color: 0xf0ca72,
              alpha: 0.04
            });
          }
        }

        if (overlayRef.current && !overlayRef.current.destroyed && guidanceUntilRef.current > now && highlightedWinsRef.current.length > 0) {
          const guidanceAlpha = Math.max(
            0,
            ((guidanceUntilRef.current - now) /
              (presentationTimings.boardDrop +
                presentationTimings.winHighlight +
                presentationTimings.cascadeDrop +
                220)) *
              0.22
          );
          const winningCells = highlightedWinsRef.current.flatMap((win) => win.cells);

          overlayRef.current.stroke({ color: 0xfff2c9, width: 2, alpha: guidanceAlpha * 0.9, cap: "round" });
          winningCells.forEach((cell) => {
            const center = getCellCenter(cell.row, cell.col);
            overlayRef.current!.moveTo(logicalWidth / 2, 18);
            overlayRef.current!.lineTo(center.x, center.y - 14);
          });

          overlayRef.current.stroke({ color: 0xf0ca72, width: 18, alpha: guidanceAlpha * 0.12, cap: "round" });
          overlayRef.current.arc(logicalWidth / 2, 26, 42, Math.PI * 0.08, Math.PI * 0.92);
          overlayRef.current.arc(logicalWidth / 2, 26, 28, Math.PI * 0.16, Math.PI * 0.84);

          winningCells.forEach((cell) => {
            const center = getCellCenter(cell.row, cell.col);
            overlayRef.current!.circle(center.x, center.y, 30);
          });
          overlayRef.current.stroke({ color: 0xffefbc, width: 3, alpha: guidanceAlpha * 0.55 });
        }

        if (overlayRef.current && !overlayRef.current.destroyed && bigWinUntilRef.current > now) {
          const rayAlpha = ((bigWinUntilRef.current - now) / 1100) * 0.18;
          overlayRef.current.moveTo(logicalWidth / 2, logicalHeight / 2);
          overlayRef.current.lineTo(logicalWidth / 2 - 180, logicalHeight / 2 - 240);
          overlayRef.current.lineTo(logicalWidth / 2 + 180, logicalHeight / 2 - 240);
          overlayRef.current.closePath();
          overlayRef.current.fill({ color: 0xf0ca72, alpha: rayAlpha });
        }

        if (overlayRef.current && !overlayRef.current.destroyed && lossVeilUntilRef.current > now) {
          const fade = ((lossVeilUntilRef.current - now) / 700) * 0.18;
          overlayRef.current.rect(0, 0, logicalWidth, logicalHeight).fill({
            color: 0x050507,
            alpha: fade
          });
          overlayRef.current.stroke({ color: 0x79685a, width: 3, alpha: fade * 0.6 });
          overlayRef.current.arc(logicalWidth / 2, logicalHeight / 2 + 34, 96, Math.PI * 0.18, Math.PI * 0.82);
        }

        if (bonusBeamsRef.current && !bonusBeamsRef.current.destroyed) {
          bonusBeamsRef.current.clear();
          if (bonusFlashUntilRef.current > now || bonusActiveRef.current) {
            const beamAlpha = bonusActiveRef.current
              ? 0.09
              : Math.max(0, ((bonusFlashUntilRef.current - now) / presentationTimings.bonusTrigger) * 0.18);

            bonusBeamsRef.current.moveTo(logicalWidth / 2 - 120, 0);
            bonusBeamsRef.current.lineTo(logicalWidth / 2 + 120, 0);
            bonusBeamsRef.current.lineTo(logicalWidth / 2 + 36, logicalHeight - 32);
            bonusBeamsRef.current.lineTo(logicalWidth / 2 - 36, logicalHeight - 32);
            bonusBeamsRef.current.closePath();
            bonusBeamsRef.current.fill({ color: 0xffefbc, alpha: beamAlpha });
            bonusBeamsRef.current.rect(0, 0, logicalWidth, logicalHeight).fill({ color: 0x09080b, alpha: beamAlpha * 0.45 });
          }
        }

        if (lightningRef.current && !lightningRef.current.destroyed) {
          lightningRef.current.clear();
          if (lightningUntilRef.current > now) {
            const progress = 1 - (lightningUntilRef.current - now) / 240;
            const pulse = Math.sin(Math.PI * Math.max(0, Math.min(1, progress)));
            const alpha = easeInOutSine(pulse) * 0.09;
            lightningRef.current.rect(0, 0, logicalWidth, logicalHeight).fill({ color: 0xf8edd9, alpha });
          }
        }
        return !mounted;
      };

      app.ticker.add(tickerListener);

        resizeObserverRef.current = new ResizeObserver(() => resizeStage());
        resizeObserverRef.current.observe(host);
        resizeStage();

        // paint the board immediately after the async Pixi init completes
        paintBoardCellsRef.current();
        
        // Restart ticker after scene tree is fully constructed
        app.ticker.start();
      } catch {
        // suppress dev-overlay promise noise from browser/graphics init failures
      }
    })();

    return () => {
      // Set mounted false FIRST to signal ticker to exit on next frame
      mounted = false;

      // Clean up timers
      timeoutsRef.current.forEach((timer) => window.clearTimeout(timer));
      timeoutsRef.current = [];

      // Clean up floating texts
      clearFloatingTexts();

      // Clean up observers
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;

      // Clean up wave unlock timer
      if (waveUnlockTimerRef.current !== null) {
        window.clearTimeout(waveUnlockTimerRef.current);
        waveUnlockTimerRef.current = null;
      }

      // Clear all refs BEFORE destroying application to prevent access during teardown
      cellRefs.current = [];
      cloudRefs.current = [];
      eyeRefs.current = [];
      moteRefs.current = [];
      symbolTexturesRef.current = {};

      // Destroy PixiJS application (which will stop ticker)
      safeDestroyApplication(app);

      // Final ref cleanup
      appRef.current = null;
      rootRef.current = null;
      overlayRef.current = null;
      lightningRef.current = null;
      bonusBeamsRef.current = null;
      runeLayerRef.current = null;
      winPathRef.current = null;
      backgroundLayerRef.current = null;
      floatingTextLayerRef.current = null;
      particleSystemRef.current = null;
    };
    // paintBoardCells intentionally omitted: the init effect repaints via
    // paintBoardCellsRef so timings/speed changes don't rebuild the Application.
  }, [safeDestroyApplication, symbolAssetSources]);

  useEffect(() => {
    if (!texturesReady) {
      return;
    }

    paintBoardCellsRef.current({ allowWave: false, allowMotion: false });
  }, [texturesReady]);

  useEffect(() => {
    if (!paintBoardCells()) {
      return;
    }

    if (shouldResetSuppressAfterPaintRef.current) {
      suppressDropAnimationRef.current = false;
      shouldResetSuppressAfterPaintRef.current = false;
    }
  }, [displayBoard, paintBoardCells, texturesReady]);

  useEffect(() => {
    paintBoardCells({ allowWave: false, allowMotion: false });
  }, [highlightedCells, paintBoardCells]);

  useEffect(() => {
    const nextRoundId = result?.roundSummary.roundId ?? null;
    if (nextRoundId !== lastPresentedRoundIdRef.current) {
      clearFloatingTexts();
      lastPresentedRoundIdRef.current = nextRoundId;
    }
  }, [result]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    if (!result) {
      return;
    }

    if (spinPhase === "MODIFIER_APPLY" && result.appliedWinMultiplier > 1) {
      queueFloatingText(root, `x${result.appliedWinMultiplier}`, logicalWidth / 2, logicalHeight / 2 - 24, 28, 0xf0ca72);
    }

    // Show a total summary only for multi-cascade rounds at ROUND_END.
    if (
      result.totalWin > 0 &&
      result.cascades.length > 1 &&
      spinPhase === "ROUND_END"
    ) {
      queueFloatingText(
        root,
        `TOTAL +${formatMoney(result.totalWin)}`,
        logicalWidth / 2,
        logicalHeight / 2 + 40,
        result.totalWin >= result.bet * 5 ? 30 : 20,
        0xf0ca72
      );
    }
  }, [result, spinPhase]);

  return (
    <div className="pixiStageShell">
      <div className="pixiStage" ref={hostRef} />
      {hoveredSymbol ? (
        <div
          className="symbolTooltip"
          style={{
            left: `${hoveredSymbol.x}px`,
            top: `${hoveredSymbol.y}px`
          }}
        >
          {hoveredSymbol.label}
        </div>
      ) : null}
    </div>
  );
}

