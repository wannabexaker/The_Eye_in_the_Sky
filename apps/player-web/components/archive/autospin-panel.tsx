/*
Purpose: groups autoplay controls inside the operator rail
Layer: frontend (player-web)
Uses: use-slot-machine.ts autospin state
*/

type AutospinPanelProps = {
  requestedAutospinCount: number;
  autospinCountInput: string;
  autoSpinOptions: number[];
  autospinValidationMessage: string;
  autospinRequiredBalance: number;
  isAutospinActive: boolean;
  autospinStopRequested: boolean;
  canStartAutospin: boolean;
  onAutospinPresetSelect: (count: number) => void;
  onAutospinInputChange: (value: string) => void;
  onApplyAutospinCount: () => number | null;
  onStartAutospin: () => void;
  onStopAutoSpin: () => void;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);

export function AutospinPanel({
  requestedAutospinCount,
  autospinCountInput,
  autoSpinOptions,
  autospinValidationMessage,
  autospinRequiredBalance,
  isAutospinActive,
  autospinStopRequested,
  canStartAutospin,
  onAutospinPresetSelect,
  onAutospinInputChange,
  onApplyAutospinCount,
  onStartAutospin,
  onStopAutoSpin
}: AutospinPanelProps) {
  return (
    <section className="inlineRounds autoPlayPanel">
      <div className="panelHeader">
        <p className="eyebrow">Autoplay</p>
        <strong className="panelValue">{requestedAutospinCount}</strong>
      </div>

      <div className="autoPlayBody">
        <div className="chipRow dense">
          {autoSpinOptions.map((option) => (
            <button
              className={`controlChip ${requestedAutospinCount === option ? "is-active" : ""}`}
              disabled={isAutospinActive}
              key={option}
              onClick={() => onAutospinPresetSelect(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>

        <div className="controlInputRow">
          <label className="controlField">
            <span className="controlLabel">Spin Count</span>
            <input
              className="controlInput"
              disabled={isAutospinActive}
              inputMode="numeric"
              onChange={(event) => onAutospinInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onApplyAutospinCount();
                }
              }}
              type="text"
              value={autospinCountInput}
            />
          </label>

          <button
            className="controlChip applyChip"
            disabled={isAutospinActive}
            onClick={onApplyAutospinCount}
            type="button"
          >
            Set
          </button>
        </div>

        <div className="controlActionsRow">
          <button
            className="controlChip is-active"
            disabled={!canStartAutospin || isAutospinActive}
            onClick={onStartAutospin}
            type="button"
          >
            Start
          </button>
          <button
            className="controlChip subtle"
            disabled={!isAutospinActive}
            onClick={onStopAutoSpin}
            type="button"
          >
            {autospinStopRequested ? "Stopping..." : "Stop"}
          </button>
        </div>

        <p className="controlHelper">Required balance: {formatMoney(autospinRequiredBalance)}</p>

        {autospinValidationMessage ? (
          <p className="validationText">{autospinValidationMessage}</p>
        ) : null}
      </div>
    </section>
  );
}
