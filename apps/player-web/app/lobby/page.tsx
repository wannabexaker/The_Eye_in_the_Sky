/*
Purpose: multi-game lobby — renders the platform game registry as a card
grid. Standalone route; the game itself stays untouched at "/".
Layer: frontend (player-web), server component (static content + links).
*/

import type { Metadata } from "next";
import Link from "next/link";
import { GAME_REGISTRY, type GameDefinition } from "@/lib/games/registry";
import "./lobby.css";

export const metadata: Metadata = {
  title: "Lobby — The Eye in the Sky",
  description: "Game lobby for the Eye in the Sky platform."
};

const STATUS_LABEL: Record<GameDefinition["status"], string> = {
  live: "Live",
  variant: "Variant",
  coming_soon: "Coming soon"
};

const ACTION_LABEL: Record<GameDefinition["status"], string> = {
  live: "Play",
  variant: "Play variant",
  coming_soon: "Locked"
};

function GameCard({ game }: { game: GameDefinition }) {
  const playable = game.status !== "coming_soon" && game.route;

  return (
    <article className="gameCard" data-status={game.status}>
      <span className="gameStatusBadge" data-status={game.status}>
        {STATUS_LABEL[game.status]}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element -- static lobby art, already optimized webp */}
      <img alt="" aria-hidden className="gameCardArt" src={game.art} />
      <h2 className="gameCardTitle">{game.title}</h2>
      <p className="gameCardTagline">{game.tagline}</p>
      <div className="gameCardMeta">
        <span className="gameCardChip">RTP {game.targetRtp}</span>
        <span className="gameCardChip">{game.volatility} volatility</span>
      </div>
      <ul className="gameCardFeatures">
        {game.features.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      {playable ? (
        <Link className="gameCardAction" href={game.route!}>
          {ACTION_LABEL[game.status]}
        </Link>
      ) : (
        <span className="gameCardActionLocked">{ACTION_LABEL[game.status]}</span>
      )}
    </article>
  );
}

export default function LobbyPage() {
  return (
    <main className="lobbyShell">
      <header className="lobbyHeader">
        <span className="lobbyKicker">SkyCode Platform</span>
        <h1 className="lobbyTitle">Game Lobby</h1>
        <p className="lobbySubtitle">One wallet, one session — every title below runs on the same engine and API.</p>
      </header>
      <section className="lobbyGrid" aria-label="Available games">
        {GAME_REGISTRY.map((game) => (
          <GameCard game={game} key={game.id} />
        ))}
      </section>
      <p className="lobbyFootnote">
        The Constellation variant runs on the shared math registry and is selected per
        deployment from the operator console. Locked titles show the platform&apos;s
        multi-game contract: registry entry + route, no game code changes.
      </p>
    </main>
  );
}
