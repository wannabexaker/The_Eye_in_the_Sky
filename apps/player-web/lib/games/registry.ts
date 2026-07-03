/*
Purpose: platform game registry — the lobby and any future host shell render
from this single data source. Adding a title is a registry entry + a route;
nothing in the existing game changes.
Layer: frontend (player-web)
*/

export type GameStatus = "live" | "variant" | "coming_soon";

export type GameDefinition = {
  id: string;
  title: string;
  tagline: string;
  status: GameStatus;
  /** Route the play button opens; locked cards have none. */
  route?: string;
  /** Card artwork (public asset path). */
  art: string;
  volatility: "low" | "medium" | "high";
  targetRtp: string;
  features: string[];
};

export const GAME_REGISTRY: GameDefinition[] = [
  {
    id: "eye-in-the-sky",
    title: "The Eye in the Sky",
    tagline: "Cluster cascades under a watching sky.",
    status: "live",
    route: "/",
    art: "/assets/symbols/symbol-panepoptis-ophthalmos.webp",
    volatility: "medium",
    targetRtp: "95.4%",
    features: ["Cluster pays 6×5", "Cascade multipliers", "Sky Opens bonus", "Provably fair ready"]
  },
  {
    id: "eye-constellation",
    title: "Eye — Constellation",
    tagline: "Count-anywhere wins, scatter-born free spins.",
    status: "variant",
    route: "/",
    art: "/assets/symbols/symbol-celestial-gate.webp",
    volatility: "high",
    targetRtp: "95.2%",
    features: ["Count-anywhere 8+", "Multiplier orbs", "Scatter free spins"]
  },
  {
    id: "samsara-wheel",
    title: "Samsara Wheel",
    tagline: "The cycle turns. Everything returns.",
    status: "coming_soon",
    art: "/assets/symbols/symbol-samsara.webp",
    volatility: "high",
    targetRtp: "—",
    features: ["In design"]
  },
  {
    id: "ouroboros-line",
    title: "Ouroboros Line",
    tagline: "A line game that eats its own tail.",
    status: "coming_soon",
    art: "/assets/symbols/symbol-ouroboros.webp",
    volatility: "medium",
    targetRtp: "—",
    features: ["In design"]
  }
];
