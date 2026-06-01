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

/** Scale-invariant ouroboros: a gold serpent biting its tail, with a clearly
 *  readable head + eye + tongue even at ~80px. viewBox 100x100, ring at r≈35. */
function OuroborosArt() {
  return (
    <svg className="ouroborosArt" viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="ouroBody" x1="20" y1="18" x2="82" y2="86" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f7dda2" />
          <stop offset="0.5" stopColor="#e2be70" />
          <stop offset="1" stopColor="#a96f29" />
        </linearGradient>
      </defs>
      {/* Serpent body — near-full circle, gap at the top where the head meets the tail */}
      <path
        d="M45 15 A 35 35 0 1 1 56 14.4"
        stroke="url(#ouroBody)"
        strokeWidth="9"
        strokeLinecap="round"
      />
      {/* Scale texture along the body */}
      <path
        d="M45 15 A 35 35 0 1 1 56 14.4"
        stroke="#5a3b16"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1 7.5"
        opacity="0.4"
      />
      {/* Head — a single smooth serpent head at the top, jaws toward the tail */}
      <path
        d="M55.5 14.4c5.6-2.8 11.6-0.4 12.9 4.9c1 4.3-1.9 8.2-6.7 8.4c-4 0.2-7.1-2.6-7.2-6.5c-0.07-2.4 0.4-4.8 1-6.8z"
        fill="url(#ouroBody)"
        stroke="#553715"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />
      {/* Eye */}
      <circle cx="61.4" cy="17.6" r="2.3" fill="#23110a" />
      <circle cx="62.2" cy="16.8" r="0.7" fill="#f7e2b1" />
      {/* Small forked tongue flicking down toward the tail */}
      <path
        className="ouroborosTongue"
        d="M56 23.4q-2 2.6-5 2.9m5-2.9q-3 1.2-6 0.2"
        stroke="#cf4b3c"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
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
