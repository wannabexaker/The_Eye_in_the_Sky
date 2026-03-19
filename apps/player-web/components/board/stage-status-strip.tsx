/*
Purpose: renders the compact board status strip above the center stage
Layer: frontend (player-web)
Uses: slot result and bonus state from page.tsx
*/

import { BonusRunningTotalDisplay } from "@/components/presentation/bonus-running-total-display";

type StageStatusStripProps = {
  roundWin: number;
  cascades: number;
  freeSpins: number;
  bonusTotal: number | null;
};

export function StageStatusStrip({
  roundWin,
  cascades,
  freeSpins,
  bonusTotal
}: StageStatusStripProps) {
  return (
    <div className="boardMetaRow">
      <div className="roundChips boardChips stageStatusStrip">
        <div className="miniStat">
          <span>Round</span>
          <strong>{roundWin.toFixed(2)}</strong>
        </div>
        <div className="miniStat">
          <span>Cascades</span>
          <strong>{cascades}</strong>
        </div>
        <div className="miniStat">
          <span>Free Spins</span>
          <strong>{freeSpins}</strong>
        </div>
        {bonusTotal !== null ? (
          <>
            <div className="miniStat">
              <span>Bonus Total</span>
              <strong>{bonusTotal.toFixed(2)}</strong>
            </div>
            <BonusRunningTotalDisplay
              freeSpinsRemaining={freeSpins}
              total={bonusTotal}
              variant="inline"
              visible
            />
          </>
        ) : null}
      </div>
    </div>
  );
}
