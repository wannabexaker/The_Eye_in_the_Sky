/*
Purpose: slide-up modal for custom autoplay spin count
Layer: frontend (player-web)
Behavior: Enter custom count, confirm to start autoplay
*/

import { useEffect, useRef, useState } from "react";

type AutoplayCountModalProps = {
  isOpen: boolean;
  inputValue: string;
  validationMessage: string;
  isSpinning: boolean;
  onInputChange: (value: string) => void;
  onConfirm: () => boolean;
  onClose: () => void;
};

export function AutoplayCountModal({
  isOpen,
  inputValue,
  validationMessage,
  isSpinning,
  onInputChange,
  onConfirm,
  onClose
}: AutoplayCountModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    const shouldClose = onConfirm();
    if (shouldClose) {
      onClose();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleConfirm();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`autoplayPopoverSheet ${isVisible ? "is-visible" : ""}`}>
        <div className="autoplayModalHeader">
          <h3 className="autoplayModalTitle">Autoplay Count</h3>
          <button
            aria-label="Close modal"
            className="autoplayModalCloseButton"
            onClick={onClose}
            type="button"
          >
            <svg viewBox="0 0 24 24" className="autoplayModalIcon">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="autoplayModalBody">
          <input
            ref={inputRef}
            aria-label="Autoplay spin count"
            className={`autoplayCountInput ${validationMessage ? "has-error" : ""}`}
            disabled={isSpinning}
            inputMode="numeric"
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="10 / 25 / 50"
            type="text"
            value={inputValue}
          />

          {validationMessage && (
            <span className="autoplayValidationError">{validationMessage}</span>
          )}
        </div>

        <div className="autoplayModalFooter">
          <button
            className="autoplayModalButton autoplayModalButtonSecondary"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
          <button
            className="autoplayModalButton autoplayModalButtonPrimary"
            disabled={!inputValue || isSpinning || Boolean(validationMessage)}
            onClick={handleConfirm}
            type="button"
          >
            Autoplay
          </button>
        </div>
    </div>
  );
}
