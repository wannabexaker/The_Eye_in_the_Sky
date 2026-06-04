/*
Purpose: renders the main spin CTA with the gold ouroboros ring asset
Layer: frontend (player-web)
Uses: presentation spin-state-machine labels
Note: the serpent is a transparent-center PNG (original artwork) pinned/centered
around the Spin core. It rotates while spinning, slow drift otherwise.
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
  ouroborosRingSrc: string;
  spinPhase: SpinPhase;
  pulseKey: number;
};

export function SpinButton({
  disabled,
  isManualClicked,
  isSpinButtonPressed,
  onKeyDown,
  onKeyUp,
  onMouseDown,
  onMouseUp,
  ouroborosRingSrc,
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="ouroborosArt" src={ouroborosRingSrc} alt="" draggable={false} />
      </span>
      <span className="spinCore">
        <span className="spinText">Spin</span>
      </span>
    </button>
  );
}
