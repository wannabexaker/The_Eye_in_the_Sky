"use client";

import { useEffect, useState } from "react";

export type ViewportBand = "phone" | "tablet" | "laptop" | "desktop" | "wide";
export type ViewportOrientation = "landscape" | "portrait";

export type ViewportState = {
  band: ViewportBand;
  height: number;
  orientation: ViewportOrientation;
  width: number;
};

const DEFAULT_VIEWPORT: ViewportState = {
  band: "desktop",
  height: 900,
  orientation: "landscape",
  width: 1440
};

const resolveBand = (width: number): ViewportBand => {
  if (width < 768) {
    return "phone";
  }
  if (width < 1024) {
    return "tablet";
  }
  if (width < 1440) {
    return "laptop";
  }
  if (width < 1920) {
    return "desktop";
  }
  return "wide";
};

const readViewport = (): ViewportState => {
  if (typeof window === "undefined") {
    return DEFAULT_VIEWPORT;
  }

  const viewport = window.visualViewport;
  const width = Math.round(viewport?.width ?? window.innerWidth);
  const height = Math.round(viewport?.height ?? window.innerHeight);

  return {
    band: resolveBand(width),
    height,
    orientation: height > width ? "portrait" : "landscape",
    width
  };
};

export function useViewport(): ViewportState {
  const [viewport, setViewport] = useState<ViewportState>(DEFAULT_VIEWPORT);

  useEffect(() => {
    let frameId: number | null = null;

    const syncViewport = () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        setViewport(readViewport());
      });
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    window.addEventListener("orientationchange", syncViewport);
    window.visualViewport?.addEventListener("resize", syncViewport);

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("orientationchange", syncViewport);
      window.visualViewport?.removeEventListener("resize", syncViewport);
    };
  }, []);

  return viewport;
}
