"use client";

import { useState } from "react";
import type { PlayerApiError } from "@/lib/api/player-api";

type ChangePasswordModalProps = {
  busy: boolean;
  error: PlayerApiError | null;
  onClose: () => void;
  onSubmit: (payload: { currentPassword: string; newPassword: string }) => Promise<void>;
  open: boolean;
};

export function ChangePasswordModal({
  busy,
  error,
  onClose,
  onSubmit,
  open
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (!open) {
    return null;
  }

  const submit = async () => {
    setSuccessMessage("");
    await onSubmit({ currentPassword, newPassword });
    setCurrentPassword("");
    setNewPassword("");
    setSuccessMessage("Password changed. Current sessions remain active.");
  };

  return (
    <div className="overlayBackdrop" role="presentation">
      <section aria-label="Change password" className="overlayModal authModal changePasswordModal">
        <header className="overlayHeader">
          <div className="overlayTitleBlock">
            <h2>Change Password</h2>
            <span className="overlayEyebrow">Current session stays active</span>
          </div>
          <button aria-label="Close change password" className="overlayClose" onClick={onClose} type="button">
            x
          </button>
        </header>

        <div className="overlayBody authBody">
          <div className="authFormGrid">
            <label className="inputGroup">
              <span>Current Password</span>
              <input
                autoComplete="current-password"
                onChange={(event) => setCurrentPassword(event.target.value)}
                type="password"
                value={currentPassword}
              />
              {error?.fieldErrors.currentPassword ? (
                <small className="authFieldError">{error.fieldErrors.currentPassword}</small>
              ) : null}
            </label>

            <label className="inputGroup">
              <span>New Password</span>
              <input
                autoComplete="new-password"
                onChange={(event) => setNewPassword(event.target.value)}
                type="password"
                value={newPassword}
              />
              {error?.fieldErrors.newPassword ? (
                <small className="authFieldError">{error.fieldErrors.newPassword}</small>
              ) : null}
            </label>
          </div>

          <div className="modalFeedback authFeedback">
            <strong>{successMessage || error?.message || (busy ? "Updating..." : "Use a new password.")}</strong>
            <span>Password reset from the login screen still revokes all sessions.</span>
          </div>

          <button
            className="welcomeButton"
            disabled={busy}
            onClick={() => void submit()}
            type="button"
          >
            {busy ? "Please wait..." : "Change Password"}
          </button>
        </div>
      </section>
    </div>
  );
}
