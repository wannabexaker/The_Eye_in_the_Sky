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
import { symbolAssetSources } from "../lib/asset-manifest";
import { ParticleSystem } from "../lib/presentation/particle-system";
import {
  PRESENTATION_TIMINGS,
  type SpinPhase
} from "../lib/presentation/spin-state-machine";

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
  hovered: boolean;
  highlighted: boolean;
  pulseUntil: number;
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
};

const drawSymbolIcon = (graphics: Graphics, symbol: SymbolId, accent: number) => {
  graphics.clear();
  graphics.stroke({ color: accent, width: 4, alpha: 0.92 });

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
};

const getCellCenter = (row: number, col: number) => ({
  x: boardOffsetX + col * (cellWidth + gap) + cellWidth / 2,
  y: boardOffsetY + row * (cellHeight + gap) + cellHeight / 2
});

export function PixiTempleBoard({
  board,
  result,
  spinPhase,
  phaseMessage,
  bonusActive
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
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [displayBoard, setDisplayBoard] = useState(board);
  const [highlightedCells, setHighlightedCells] = useState<{ row: number; col: number }[]>([]);
  const [hoveredSymbol, setHoveredSymbol] = useState<{ label: string; x: number; y: number } | null>(null);
  const displayBoardRef = useRef(displayBoard);

  const applySymbolTexture = (cell: CellSprite, symbol: SymbolId, accent: number) => {
    const texture = symbolTexturesRef.current[symbol];
    const presentation = symbolPresentation[symbol];

    if (!texture) {
      cell.iconSprite.visible = false;
      cell.iconFallback.visible = true;
      drawSymbolIcon(cell.iconFallback, symbol, accent);
      cell.iconFallback.scale.set(presentation.fallbackScale ?? presentation.fit);
      cell.iconFallback.x = cellWidth / 2;
      cell.iconFallback.y = cellHeight / 2 + (presentation.offsetY ?? 0);
      return;
    }

    const maxSize = 96;
    const baseScale = Math.min(maxSize / texture.width, maxSize / texture.height);
    const scale = baseScale * presentation.fit;

    cell.iconFallback.clear();
    cell.iconFallback.visible = false;
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
    floatingTextsRef.current.forEach((text) => text.destroy());
    floatingTextsRef.current = [];
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
        sprite.pulseUntil = performance.now() + PRESENTATION_TIMINGS.winHighlight;
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

    const pulse = 0.65 + (Math.sin((now - highlightStartRef.current) / 90) + 1) * 0.18;

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

    const alpha = 0.06 + (Math.sin(now / 1500) + 1) * 0.025;

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
    root: Container,
    text: string,
    x: number,
    y: number,
    size: number,
    color: number
  ) => {
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
    root.addChild(node);
    floatingTextsRef.current.push(node);
  };

  const paintBoardCells = useCallback(() => {
    const app = appRef.current;
    if (!app || cellRefs.current.length === 0) {
      return false;
    }

    const phase = phaseRef.current;

    // sync visible tiles with the latest resolved board state
    displayBoardRef.current.forEach((row, rowIndex) => {
      row.forEach((symbol, colIndex) => {
        const cell = cellRefs.current[rowIndex * cols + colIndex];
        if (!cell) {
          return;
        }

        const palette = symbolPalette[symbol];
        const dropDistance =
          phase === "CASCADE" ? 80 : phase === "SPIN_START" ? 180 : 120;

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

        cell.startY = cell.targetY - dropDistance;
        cell.animStart = app.ticker.lastTime + colIndex * 34 + rowIndex * 12;
        cell.animDuration = phase === "CASCADE" ? 220 : 360;
        cell.animating = true;
      });
    });

    return true;
  }, []);

  useEffect(() => {
    setDisplayBoard(board);
  }, [board]);

  useEffect(() => {
    timeoutsRef.current.forEach((timer) => window.clearTimeout(timer));
    timeoutsRef.current = [];

    if (!result || result.cascades.length === 0) {
      setDisplayBoard(board);
      clearWinningCells();
      return;
    }

    if (result.bonusTriggered) {
      bonusFlashUntilRef.current = performance.now() + PRESENTATION_TIMINGS.bonusTrigger;
      emitBonusBurst();
    }

    if (result.totalWin >= result.bet * 5) {
      bigWinUntilRef.current = performance.now() + 1100;
    }

    if (result.totalWin > 0) {
      guidanceUntilRef.current =
        performance.now() +
        PRESENTATION_TIMINGS.boardDrop +
        PRESENTATION_TIMINGS.winHighlight +
        PRESENTATION_TIMINGS.cascadeDrop +
        220;
      lossVeilUntilRef.current = 0;
    } else if (!result.bonusTriggered) {
      lossVeilUntilRef.current = performance.now() + 700;
      guidanceUntilRef.current = 0;
    }

    let cursor = 0;
    result.cascades.forEach((cascade) => {
      timeoutsRef.current.push(
        window.setTimeout(() => {
          setDisplayBoard(cascade.boardBefore);
          clearWinningCells();
        }, cursor)
      );

      timeoutsRef.current.push(
        window.setTimeout(() => {
          markWinningCells(cascade.wins);
        }, cursor + PRESENTATION_TIMINGS.boardDrop)
      );

      timeoutsRef.current.push(
        window.setTimeout(() => {
          emitWinParticles(cascade.wins);
        }, cursor + PRESENTATION_TIMINGS.boardDrop + PRESENTATION_TIMINGS.winHighlight - 80)
      );

      timeoutsRef.current.push(
        window.setTimeout(() => {
          clearWinningCells();
          setDisplayBoard(cascade.boardAfter);
        }, cursor + PRESENTATION_TIMINGS.boardDrop + PRESENTATION_TIMINGS.winHighlight + 60)
      );

      cursor +=
        PRESENTATION_TIMINGS.boardDrop +
        PRESENTATION_TIMINGS.winHighlight +
        PRESENTATION_TIMINGS.cascadeDrop +
        110;
    });

    return () => {
      timeoutsRef.current.forEach((timer) => window.clearTimeout(timer));
      timeoutsRef.current = [];
    };
  }, [board, result]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const app = new Application();
    appRef.current = app;
    let mounted = true;

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
          resolution: window.devicePixelRatio || 1
        });

        const textureEntries = await Promise.all(
          (Object.entries(symbolAssetSources) as [SymbolId, readonly string[]][]).map(
            async ([symbol, urls]) => {
              for (const url of urls) {
                try {
                  const texture = await Assets.load(url);
                  return [symbol, texture] as const;
                } catch {
                  // try the next source, typically svg fallback
                }
              }

              return [symbol, null] as const;
            }
          )
        );

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
          app.destroy();
          return;
        }

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

      const particleSystem = new ParticleSystem(root, 140);
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

      const frame = new Graphics();
      frame.zIndex = 0;
      frame.roundRect(0, 0, logicalWidth - 24, logicalHeight - 24, 26).fill({
        color: 0x120d11,
        alpha: 0.86
      });
      frame.roundRect(0, 0, logicalWidth - 24, logicalHeight - 24, 26).stroke({
        color: 0xf0ca72,
        width: 2,
        alpha: 0.18
      });
      frame.x = -12;
      frame.y = -12;
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
            hovered: false,
            highlighted: false,
            pulseUntil: 0,
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

      app.ticker.add((ticker) => {
        const now = ticker.lastTime;
        const deltaMs = ticker.deltaMS ?? 16.6667;

        if (now > nextLightningFlashRef.current) {
          lightningUntilRef.current = now + 140;
          nextLightningFlashRef.current = now + 4200 + ((Math.sin(now / 2300) + 1) * 0.5 + 0.2) * 5200;
        }

        cloudRefs.current.forEach((cloud, index) => {
          cloud.node.x = cloud.baseX + Math.sin(now / 1800 + cloud.seed) * (10 + index * 0.5);
          cloud.node.alpha = 0.025 + (Math.sin(now / 1400 + cloud.seed) + 1) * 0.014;
        });

        eyeRefs.current.forEach((eye) => {
          eye.node.x = eye.baseX + Math.sin(now / 2200 + eye.seed) * 12;
          eye.node.y = eye.baseY + Math.cos(now / 1700 + eye.seed) * 4;
          eye.node.alpha = 0.03 + (Math.sin(now / 1300 + eye.seed) + 1) * 0.012;
        });

        moteRefs.current.forEach((mote) => {
          mote.node.x = mote.baseX + Math.sin(now / 900 + mote.seed) * 10;
          mote.node.y = mote.baseY + Math.cos(now / 1100 + mote.seed) * 14;
          mote.node.alpha = 0.08 + (Math.sin(now / 700 + mote.seed) + 1) * 0.08;
        });

        particleSystemRef.current?.update(deltaMs);

        floatingTextsRef.current = floatingTextsRef.current.filter((text) => {
          text.y -= 0.35;
          text.alpha -= 0.013;

          if (text.alpha <= 0) {
            text.destroy();
            return false;
          }

          return true;
        });

        drawRuneLayer(runeLayer, now);
        drawWinPaths(winPath, highlightedWinsRef.current, now);

        const highlightPulse = highlightedWinsRef.current.length > 0
          ? 0.72 + (Math.sin((now - highlightStartRef.current) / 85) + 1) * 0.14
          : 0;

        cellRefs.current.forEach((cell) => {
          const currentPhase = phaseRef.current;
          const idleMotionActive =
            (currentPhase === "IDLE" || currentPhase === "ROUND_END") && !cell.animating;
          const progress = Math.min(1, Math.max(0, (now - cell.animStart) / cell.animDuration));
          const animating = cell.animating && now >= cell.animStart;
          const eased = easeOutBack(progress);
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
          const pulseBoost = cell.pulseUntil > now
            ? Math.sin((1 - (cell.pulseUntil - now) / PRESENTATION_TIMINGS.winHighlight) * Math.PI * 3) * 0.035
            : 0;
          const scale = 1 + breathing + hoverBoost + pulseBoost;

          cell.container.x = cell.baseX + shake;
          cell.container.y = animatedY + shakeY;
          cell.container.scale.set(scale);
          cell.container.alpha = animating ? 0.38 + progress * 0.62 : 1;

          cell.glow.alpha =
            (cell.hovered ? 0.14 : 0.04) +
            (cell.highlighted ? 0.18 * highlightPulse : 0);

          if (progress >= 1) {
            cell.animating = false;
          }
        });

        overlay.clear();
        if (phaseRef.current === "SPIN_START") {
          overlay.rect(0, 0, logicalWidth, logicalHeight).fill({ color: 0xf0ca72, alpha: 0.04 });
        }

        if (phaseRef.current === "WIN_CHECK" && highlightedWinsRef.current.length > 0) {
          overlay.rect(0, 0, logicalWidth, logicalHeight).fill({
            color: 0xf0ca72,
            alpha: 0.025 + highlightPulse * 0.025
          });
        }

        if (guidanceUntilRef.current > now && highlightedWinsRef.current.length > 0) {
          const guidanceAlpha = Math.max(
            0,
            ((guidanceUntilRef.current - now) /
              (PRESENTATION_TIMINGS.boardDrop +
                PRESENTATION_TIMINGS.winHighlight +
                PRESENTATION_TIMINGS.cascadeDrop +
                220)) *
              0.22
          );
          const winningCells = highlightedWinsRef.current.flatMap((win) => win.cells);

          overlay.stroke({ color: 0xfff2c9, width: 2, alpha: guidanceAlpha * 0.9, cap: "round" });
          winningCells.forEach((cell) => {
            const center = getCellCenter(cell.row, cell.col);
            overlay.moveTo(logicalWidth / 2, 18);
            overlay.lineTo(center.x, center.y - 14);
          });

          overlay.stroke({ color: 0xf0ca72, width: 18, alpha: guidanceAlpha * 0.12, cap: "round" });
          overlay.arc(logicalWidth / 2, 26, 42, Math.PI * 0.08, Math.PI * 0.92);
          overlay.arc(logicalWidth / 2, 26, 28, Math.PI * 0.16, Math.PI * 0.84);

          winningCells.forEach((cell) => {
            const center = getCellCenter(cell.row, cell.col);
            overlay.circle(center.x, center.y, 30);
          });
          overlay.stroke({ color: 0xffefbc, width: 3, alpha: guidanceAlpha * 0.55 });
        }

        if (bigWinUntilRef.current > now) {
          const rayAlpha = ((bigWinUntilRef.current - now) / 1100) * 0.18;
          overlay.moveTo(logicalWidth / 2, logicalHeight / 2);
          overlay.lineTo(logicalWidth / 2 - 180, logicalHeight / 2 - 240);
          overlay.lineTo(logicalWidth / 2 + 180, logicalHeight / 2 - 240);
          overlay.closePath();
          overlay.fill({ color: 0xf0ca72, alpha: rayAlpha });
        }

        if (lossVeilUntilRef.current > now) {
          const fade = ((lossVeilUntilRef.current - now) / 700) * 0.18;
          overlay.rect(0, 0, logicalWidth, logicalHeight).fill({
            color: 0x050507,
            alpha: fade
          });
          overlay.stroke({ color: 0x79685a, width: 3, alpha: fade * 0.6 });
          overlay.arc(logicalWidth / 2, logicalHeight / 2 + 34, 96, Math.PI * 0.18, Math.PI * 0.82);
        }

        bonusBeams.clear();
        if (bonusFlashUntilRef.current > now || bonusActiveRef.current) {
          const beamAlpha = bonusActiveRef.current
            ? 0.09
            : Math.max(0, ((bonusFlashUntilRef.current - now) / PRESENTATION_TIMINGS.bonusTrigger) * 0.18);

          bonusBeams.moveTo(logicalWidth / 2 - 120, 0);
          bonusBeams.lineTo(logicalWidth / 2 + 120, 0);
          bonusBeams.lineTo(logicalWidth / 2 + 36, logicalHeight - 32);
          bonusBeams.lineTo(logicalWidth / 2 - 36, logicalHeight - 32);
          bonusBeams.closePath();
          bonusBeams.fill({ color: 0xffefbc, alpha: beamAlpha });
          bonusBeams.rect(0, 0, logicalWidth, logicalHeight).fill({ color: 0x09080b, alpha: beamAlpha * 0.45 });
        }

        lightning.clear();
        if (lightningUntilRef.current > now) {
          const alpha = ((lightningUntilRef.current - now) / 140) * 0.22;
          lightning.rect(0, 0, logicalWidth, logicalHeight).fill({ color: 0xf8edd9, alpha });
        }
      });

        resizeObserverRef.current = new ResizeObserver(() => resizeStage());
        resizeObserverRef.current.observe(host);
        resizeStage();

        // paint the board immediately after the async Pixi init completes
        paintBoardCells();
      } catch {
        // suppress dev-overlay promise noise from browser/graphics init failures
      }
    })();

    return () => {
      mounted = false;
      timeoutsRef.current.forEach((timer) => window.clearTimeout(timer));
      timeoutsRef.current = [];
      clearFloatingTexts();
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      app.destroy(true, { children: true });
      appRef.current = null;
      rootRef.current = null;
    };
  }, [paintBoardCells]);

  useEffect(() => {
    if (!paintBoardCells()) {
      return;
    }
  }, [displayBoard, highlightedCells, paintBoardCells]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    clearFloatingTexts();

    if (!result) {
      return;
    }

    if (spinPhase === "MODIFIER_APPLY" && result.appliedWinMultiplier > 1) {
      queueFloatingText(root, `x${result.appliedWinMultiplier}`, logicalWidth / 2, 30, 28, 0xf0ca72);
    }

    if (
      result.totalWin > 0 &&
      (spinPhase === "WIN_CHECK" || spinPhase === "CASCADE" || spinPhase === "ROUND_END")
    ) {
      queueFloatingText(
        root,
        `+${formatMoney(result.totalWin)}`,
        logicalWidth / 2,
        logicalHeight - 20,
        result.totalWin >= result.bet * 5 ? 34 : 22,
        0xf8edd9
      );
    }
  }, [result, spinPhase]);

  return (
    <div className="pixiStageShell">
      <div className={`pixiStage phase-${spinPhase.toLowerCase()}`} ref={hostRef} />
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
