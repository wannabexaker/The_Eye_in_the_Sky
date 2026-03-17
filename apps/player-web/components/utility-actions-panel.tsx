/*
Purpose: keeps secondary account and utility actions out of the center stage
Layer: frontend (player-web)
Uses: page.tsx modal and panel toggles
*/

type UtilityActionsPanelProps = {
  onReset: () => void;
  onPaymentMethods: () => void;
  onWalletHistory: () => void;
  onToggleHistory: () => void;
  onToggleSettings: () => void;
  onToggleDebug: () => void;
};

export function UtilityActionsPanel({
  onReset,
  onPaymentMethods,
  onWalletHistory,
  onToggleHistory,
  onToggleSettings,
  onToggleDebug
}: UtilityActionsPanelProps) {
  return (
    <section className="inlineRounds utilityPanel">
      <div className="panelHeader">
        <p className="eyebrow">Actions</p>
      </div>

      <div className="utilityGrid">
        <button className="secondaryAction" onClick={onReset} type="button">
          Reset
        </button>
        <button className="secondaryAction" onClick={onPaymentMethods} type="button">
          Methods
        </button>
        <button className="secondaryAction" onClick={onWalletHistory} type="button">
          Wallet
        </button>
        <button className="secondaryAction" onClick={onToggleHistory} type="button">
          Rounds
        </button>
        <button className="secondaryAction" onClick={onToggleSettings} type="button">
          Settings
        </button>
        <button className="secondaryAction" onClick={onToggleDebug} type="button">
          Debug
        </button>
      </div>
    </section>
  );
}
