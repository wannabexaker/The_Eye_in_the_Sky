/*
Purpose: keeps the current bonus total visible near the board during free spins
Layer: frontend (player-web)
Uses: bonus state from use-slot-machine.ts
*/

type BonusRunningTotalDisplayProps = {
  total: number;
  freeSpinsRemaining: number;
  visible: boolean;
  variant?: "overlay" | "inline";
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

export function BonusRunningTotalDisplay({
  total,
  freeSpinsRemaining,
  visible,
  variant = "overlay"
}: BonusRunningTotalDisplayProps) {
  if (!visible) {
    return null;
  }

  return (
    <div
      className={`bonusRunningTotal ${variant === "inline" ? "bonusRunningTotalInline" : ""}`}
      role="status"
    >
      <span className="bonusRunningLabel">Bonus Total</span>
      <strong className="bonusRunningAmount">{formatMoney(total)}</strong>
      <span className="bonusRunningMeta">{freeSpinsRemaining} free spins remaining</span>
    </div>
  );
}
