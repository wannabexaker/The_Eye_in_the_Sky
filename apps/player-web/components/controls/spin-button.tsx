/*
Purpose: renders the main spin CTA with a scale-invariant SVG ouroboros ring
Layer: frontend (player-web)
Uses: presentation spin-state-machine labels
Note: the serpent is an SVG (not tiny CSS pseudo-elements) so the snake stays
recognizable even at the ~80px dock size. The ring rotates on spin.
*/

import { type SpinPhase } from "@/lib/presentation/spin-state-machine";
import { type MouseEvent as ReactMouseEvent } from "react";

type SpinButtonProps = {
  disabled: boolean;
  isManualClicked: boolean;
  isSpinButtonPressed: boolean;
  onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  onKeyUp?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
  spinPhase: SpinPhase;
  pulseKey: number;
};

/** Ouroboros serpent ring (original-art proportions), centered and filling the
 *  ring so it reads as a clean snake circling the "Spin" core at any size.
 *  viewBox is cropped to the serpent bounds so it sits pinned over the button. */
function OuroborosArt() {
  return (
    <svg className="ouroborosArt" viewBox="244 258 536 514" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ouroBody" x1="300" y1="322" x2="704" y2="708" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f6dca0" />
          <stop offset="0.55" stopColor="#e2be70" />
          <stop offset="1" stopColor="#a9742c" />
        </linearGradient>
      </defs>
      {/* Serpent body */}
      <path
        d="M666 364C616 312 548 286 478 292C356 304 266 412 278 536C290 660 392 750 518 736C624 724 706 650 730 556"
        stroke="url(#ouroBody)"
        strokeWidth="44"
        strokeLinecap="round"
      />
      {/* Neck tapering into the head */}
      <path
        d="M730 556C742 500 726 444 682 400"
        stroke="#f3dca0"
        strokeWidth="27"
        strokeLinecap="round"
      />
      {/* Head biting toward the tail */}
      <path
        d="M682 400L750 372L723 444Z"
        fill="#f3dca0"
        stroke="#5a3b16"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {/* Eye */}
      <circle cx="424" cy="420" r="16" fill="#23110a" />
      <circle cx="430" cy="413" r="5.5" fill="#f7e2b1" />
    </svg>
  );
}

export function SpinButton({
  disabled,
  isManualClicked,
  isSpinButtonPressed,
  onKeyDown,
  onKeyUp,
  onMouseDown,
  onMouseUp,
  spinPhase,
  pulseKey
}: SpinButtonProps) {
  const spinning = spinPhase !== "IDLE" && spinPhase !== "ROUND_END";

  const suppressSelectionOnMouseDown = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  return (
    <button
      className={`spinCta ${spinning ? "is-spinning" : ""} ${isManualClicked ? "is-manual-clicked" : ""} ${isSpinButtonPressed ? "is-pressed" : ""}`}
      data-phase={spinPhase}
      disabled={disabled}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onMouseDown={(event) => {
        suppressSelectionOnMouseDown(event);
        onMouseDown?.();
      }}
      onMouseUp={onMouseUp}
      title="Spin"
      type="button"
    >
      <span className="spinRipple" key={pulseKey} />
      <span aria-hidden="true" className="ouroborosRing">
        <OuroborosArt />
      </span>
      <span className="spinCore">
        <span className="spinText">Spin</span>
      </span>
    </button>
  );
}
