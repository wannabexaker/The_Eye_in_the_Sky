import type { ReactNode } from "react";

type OverlayModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function OverlayModal({ open, title, onClose, children }: OverlayModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="overlayBackdrop" role="presentation">
      <section aria-label={title} className="overlayModal">
        <header className="overlayHeader">
          <div className="overlayTitleBlock">
            <h2>{title}</h2>
          </div>
          <button className="secondaryAction" onClick={onClose} type="button">
            Close
          </button>
        </header>
        <div className="overlayBody">{children}</div>
      </section>
    </div>
  );
}
