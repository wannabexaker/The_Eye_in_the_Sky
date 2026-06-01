"use client";

/*
Purpose: single source of truth for viewport/orientation breakpoints.
Layer: frontend (player-web)
Replaces the duplicated matchMedia effects previously copied across the rail
components. The query strings are kept identical to the original per-component
logic so this refactor is behavior-preserving.
*/

import { useEffect, useState } from "react";

/** Breakpoint query strings — the single place these edges are defined. */
export const VIEWPORT_QUERIES = {
  /** Compact desktop / laptop band. */
  compact: "(max-width: 1600px), (max-height: 900px)",
  /** Any portrait surface (phone or vertical monitor). */
  portrait: "(orientation: portrait) and (max-aspect-ratio: 10/16)",
  /** Handheld portrait only (phones/small tablets), not vertical desktop monitors. */
  handheldPortrait:
    "(orientation: portrait) and (max-aspect-ratio: 10/16) and (max-width: 11in)",
} as const;

export type Viewport = {
  compactView: boolean;
  portraitView: boolean;
  handheldPortraitView: boolean;
};

const INITIAL: Viewport = {
  compactView: false,
  portraitView: false,
  handheldPortraitView: false,
};

/**
 * Reactive viewport flags driven by matchMedia. SSR-safe: starts `false` on the
 * server and the first client paint, then syncs in an effect.
 */
export function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>(INITIAL);

  useEffect(() => {
    const compact = window.matchMedia(VIEWPORT_QUERIES.compact);
    const portrait = window.matchMedia(VIEWPORT_QUERIES.portrait);
    const handheld = window.matchMedia(VIEWPORT_QUERIES.handheldPortrait);

    const sync = () =>
      setViewport({
        compactView: compact.matches,
        portraitView: portrait.matches,
        handheldPortraitView: handheld.matches,
      });

    sync();
    compact.addEventListener("change", sync);
    portrait.addEventListener("change", sync);
    handheld.addEventListener("change", sync);

    return () => {
      compact.removeEventListener("change", sync);
      portrait.removeEventListener("change", sync);
      handheld.removeEventListener("change", sync);
    };
  }, []);

  return viewport;
}
