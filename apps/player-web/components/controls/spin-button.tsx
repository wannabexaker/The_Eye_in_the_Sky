/*
Purpose: renders the main spin CTA with ouroboros ring styling
Layer: frontend (player-web)
Uses: presentation spin-state-machine labels
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
        <span className="ouroborosBody" />
        <span className="ouroborosHead" />
        <span className="ouroborosEye" />
      </span>
      <span className="spinCore">
        <span className="spinText">Spin</span>
      </span>
    </button>
  );
}
