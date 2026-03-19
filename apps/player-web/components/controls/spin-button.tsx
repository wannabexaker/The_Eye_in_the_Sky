/*
Purpose: renders the main spin CTA with ouroboros ring styling
Layer: frontend (player-web)
Uses: presentation spin-state-machine labels
*/

import { type SpinPhase } from "@/lib/presentation/spin-state-machine";

type SpinButtonProps = {
  disabled: boolean;
  onClick: () => void;
  spinPhase: SpinPhase;
  pulseKey: number;
};

export function SpinButton({
  disabled,
  onClick,
  spinPhase,
  pulseKey
}: SpinButtonProps) {
  const spinning = spinPhase !== "IDLE" && spinPhase !== "ROUND_END";

  return (
    <button
      className={`spinCta ${spinning ? "is-spinning" : ""}`}
      data-phase={spinPhase}
      disabled={disabled}
      onClick={onClick}
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
