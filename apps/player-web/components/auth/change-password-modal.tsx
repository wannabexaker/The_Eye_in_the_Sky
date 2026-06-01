import { useState } from "react";

type ChangePasswordModalProps = {
  busy: boolean;
  onChangePassword: (payload: { currentPassword: string; newPassword: string }) => Promise<void>;
};

type FieldErrors = {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getErrorCode = (error: unknown) =>
  isRecord(error) && typeof error.code === "string" ? error.code : undefined;

export function ChangePasswordModal({ busy, onChangePassword }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visibleFields, setVisibleFields] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState("");

  const toggleField = (field: string) => {
    setVisibleFields((current) => ({ ...current, [field]: !current[field] }));
  };

  const submit = async () => {
    const nextErrors: FieldErrors = {};
    if (!currentPassword) {
      nextErrors.currentPassword = "Current password is required.";
    }
    if (newPassword.length < 8) {
      nextErrors.newPassword = "Min 8 characters.";
    }
    if (confirmPassword !== newPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setFeedback("");

    try {
      await onChangePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFeedback("Password changed successfully.");
    } catch (error) {
      if (getErrorCode(error) === "WRONG_PASSWORD") {
        setFieldErrors({ currentPassword: "Wrong password. Please check and try again." });
        return;
      }

      setFeedback(error instanceof Error ? error.message : "Password change failed.");
    }
  };

  const renderToggleIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );

  const renderPasswordField = (
    id: "currentPassword" | "newPassword" | "confirmPassword",
    label: string,
    value: string,
    setValue: (value: string) => void,
    autoComplete: string
  ) => (
    <label className="inputGroup authPasswordField">
      <span>{label}</span>
      <div className="authPasswordInputWrap">
        <input
          autoComplete={autoComplete}
          onChange={(event) => {
            setValue(event.target.value);
            setFieldErrors((current) => ({ ...current, [id]: undefined }));
          }}
          type={visibleFields[id] ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={visibleFields[id] ? "Hide password" : "Show password"}
          className="authPasswordToggle"
          onClick={() => toggleField(id)}
          title={visibleFields[id] ? "Hide password" : "Show password"}
          type="button"
        >
          {renderToggleIcon()}
        </button>
      </div>
      {fieldErrors[id] ? <small className="authFieldError">{fieldErrors[id]}</small> : null}
    </label>
  );

  return (
    <div className="authFormGrid changePasswordGrid">
      {renderPasswordField("currentPassword", "Current Password", currentPassword, setCurrentPassword, "current-password")}
      {renderPasswordField("newPassword", "New Password", newPassword, setNewPassword, "new-password")}
      {renderPasswordField("confirmPassword", "Confirm New Password", confirmPassword, setConfirmPassword, "new-password")}

      <div className="modalFeedback authFeedback">
        <strong>{feedback || (busy ? "Updating..." : "Sessions stay active after password change.")}</strong>
        <span>Use the new password on the next login. Current sessions are not rotated by this action.</span>
      </div>

      <button className="welcomeButton" disabled={busy} onClick={() => void submit()} type="button">
        {busy ? "Please wait..." : "Change Password"}
      </button>
    </div>
  );
}
