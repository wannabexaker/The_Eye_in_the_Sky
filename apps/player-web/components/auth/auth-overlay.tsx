import { useEffect, useState } from "react";
import { shellAssets } from "@/lib/assets/asset-manifest";
import { generateRandomDisplayName } from "@/lib/identity/random-display-name";

type AuthMode = "login" | "register" | "forgot";
type ForgotStep = "email" | "reset";

type AuthOverlayProps = {
  busy: boolean;
  error: string;
  onContinueAsGuest: () => void;
  onForgotPassword: (payload: { email: string }) => Promise<{ resetToken?: string }>;
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
  onRegister: (payload: { email: string; password: string; displayName: string }) => Promise<void>;
  onResetPassword: (payload: { token: string; newPassword: string }) => Promise<void>;
};

type FieldErrors = {
  email?: string;
  password?: string;
  displayName?: string;
  resetToken?: string;
  newPassword?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getErrorCode = (error: unknown) =>
  isRecord(error) && typeof error.code === "string" ? error.code : undefined;

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function AuthOverlay({
  busy,
  error,
  onContinueAsGuest,
  onForgotPassword,
  onLogin,
  onRegister,
  onResetPassword
}: AuthOverlayProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [forgotStep, setForgotStep] = useState<ForgotStep>("email");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [devResetToken, setDevResetToken] = useState("");
  const [emailNotFound, setEmailNotFound] = useState(false);

  useEffect(() => {
    if (mode === "register" && !displayName.trim()) {
      setDisplayName(generateRandomDisplayName());
    }
  }, [displayName, mode]);

  const clearFeedback = () => {
    setLocalError("");
    setFieldErrors({});
    setEmailNotFound(false);
  };

  const switchMode = (nextMode: AuthMode) => {
    clearFeedback();
    setMode(nextMode);
    if (nextMode === "register" && !displayName.trim()) {
      setDisplayName(generateRandomDisplayName());
    }
    if (nextMode === "forgot") {
      setForgotStep("email");
    }
  };

  const rerollDisplayName = () => {
    setDisplayName(generateRandomDisplayName());
    setFieldErrors((current) => ({ ...current, displayName: undefined }));
  };

  const submitAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setFieldErrors({
        email: !email.trim() ? "Email is required." : undefined,
        password: !password.trim() ? "Password is required." : undefined
      });
      return;
    }

    clearFeedback();

    try {
      if (mode === "login") {
        await onLogin({ email, password });
        return;
      }

      await onRegister({
        email,
        password,
        displayName: displayName.trim() || generateRandomDisplayName()
      });
    } catch (submitError) {
      const code = getErrorCode(submitError);

      if (code === "WRONG_PASSWORD") {
        setFieldErrors({ password: "Wrong password. Please check and try again." });
        return;
      }

      if (code === "EMAIL_NOT_FOUND") {
        setFieldErrors({ email: "No account with this email." });
        setEmailNotFound(true);
        return;
      }

      if (code === "EMAIL_TAKEN") {
        setFieldErrors({ email: "An account with this email already exists." });
        return;
      }

      if (code === "WEAK_PASSWORD") {
        setFieldErrors({ password: "Min 8 characters." });
        return;
      }

      if (code === "INVALID_DISPLAY_NAME") {
        setFieldErrors({ displayName: "Use letters, numbers, spaces, underscores, or hyphens." });
        return;
      }

      setLocalError(getErrorMessage(submitError, mode === "login" ? "Login failed." : "Registration failed."));
    }
  };

  const submitForgotEmail = async () => {
    if (!email.trim()) {
      setFieldErrors({ email: "Email is required." });
      return;
    }

    clearFeedback();
    try {
      const response = await onForgotPassword({ email });
      if (response.resetToken) {
        setResetToken(response.resetToken);
        setDevResetToken(response.resetToken);
      }
      setForgotStep("reset");
    } catch (forgotError) {
      setLocalError(getErrorMessage(forgotError, "Password reset request failed."));
    }
  };

  const submitResetPassword = async () => {
    const nextErrors: FieldErrors = {};
    if (!resetToken.trim()) {
      nextErrors.resetToken = "Reset token is required.";
    }
    if (newPassword.length < 8) {
      nextErrors.newPassword = "Min 8 characters.";
    } else if (newPassword !== confirmPassword) {
      nextErrors.newPassword = "Passwords do not match.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    clearFeedback();
    try {
      await onResetPassword({ token: resetToken.trim(), newPassword });
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setResetToken("");
      setDevResetToken("");
      setForgotStep("email");
      setMode("login");
      setLocalError("Password reset complete. Login with the new password.");
    } catch (resetError) {
      const code = getErrorCode(resetError);
      if (code === "WEAK_PASSWORD") {
        setFieldErrors({ newPassword: "Min 8 characters." });
        return;
      }
      setLocalError(getErrorMessage(resetError, "Password reset failed."));
    }
  };

  const renderPasswordToggleIcon = () => (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );

  const title =
    mode === "login"
      ? "Temple Login"
      : mode === "register"
        ? "Create Player Account"
        : "Reset Password";

  return (
    <div className="overlayBackdrop welcomeBackdrop" role="presentation">
      <section aria-label="Authentication" className="overlayModal welcomeModal authModal">
        <header className="overlayHeader welcomeHeader">
          <div className="welcomeLogoStack">
            <div
              aria-hidden="true"
              className="welcomeLogo"
              style={{ backgroundImage: `url(${shellAssets.logo})` }}
            />
            <div className="overlayTitleBlock welcomeTitleBlock">
              <h2>{title}</h2>
              <span className="overlayEyebrow">Server-backed session or local guest</span>
            </div>
          </div>
        </header>

        <div className="overlayBody welcomeBody authBody">
          <p className="welcomeTagline">
            {mode === "login"
              ? "Sign in to restore wallet, rounds, and active bonus state."
              : mode === "register"
                ? "Register a new player profile with secure cookie-based sessions."
                : "Request a reset token, then set a new password."}
          </p>

          <div className="authToggleRow">
            <button
              className={`controlChip ${mode === "login" ? "is-active" : ""}`}
              onClick={() => switchMode("login")}
              type="button"
            >
              Login
            </button>
            <button
              className={`controlChip ${mode === "register" ? "is-active" : ""}`}
              onClick={() => switchMode("register")}
              type="button"
            >
              Register
            </button>
          </div>

          {mode === "forgot" ? (
            <div className="authFormGrid">
              {forgotStep === "email" ? (
                <>
                  <label className="inputGroup">
                    <span>Email</span>
                    <input
                      autoComplete="email"
                      onChange={(event) => {
                        setEmail(event.target.value);
                        setEmailNotFound(false);
                        setFieldErrors((current) => ({ ...current, email: undefined }));
                      }}
                      type="email"
                      value={email}
                    />
                    {fieldErrors.email ? <small className="authFieldError">{fieldErrors.email}</small> : null}
                  </label>
                  <button className="welcomeButton" disabled={busy} onClick={() => void submitForgotEmail()} type="button">
                    {busy ? "Please wait..." : "Send Reset Token"}
                  </button>
                </>
              ) : (
                <>
                  <label className="inputGroup">
                    <span>Reset Token</span>
                    <input
                      autoComplete="one-time-code"
                      onChange={(event) => {
                        setResetToken(event.target.value);
                        setFieldErrors((current) => ({ ...current, resetToken: undefined }));
                      }}
                      value={resetToken}
                    />
                    {devResetToken ? <small className="authDevHint">(dev only) Token auto-filled from API response.</small> : null}
                    {fieldErrors.resetToken ? <small className="authFieldError">{fieldErrors.resetToken}</small> : null}
                  </label>
                  <label className="inputGroup authPasswordField">
                    <span>New Password</span>
                    <div className="authPasswordInputWrap">
                      <input
                        autoComplete="new-password"
                        onChange={(event) => {
                          setNewPassword(event.target.value);
                          setFieldErrors((current) => ({ ...current, newPassword: undefined }));
                        }}
                        type={showResetPassword ? "text" : "password"}
                        value={newPassword}
                      />
                      <button
                        aria-label={showResetPassword ? "Hide password" : "Show password"}
                        className="authPasswordToggle"
                        onClick={() => setShowResetPassword((current) => !current)}
                        title={showResetPassword ? "Hide password" : "Show password"}
                        type="button"
                      >
                        {renderPasswordToggleIcon()}
                      </button>
                    </div>
                  </label>
                  <label className="inputGroup">
                    <span>Confirm New Password</span>
                    <input
                      autoComplete="new-password"
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      type={showResetPassword ? "text" : "password"}
                      value={confirmPassword}
                    />
                    {fieldErrors.newPassword ? <small className="authFieldError">{fieldErrors.newPassword}</small> : null}
                  </label>
                  <button className="welcomeButton" disabled={busy} onClick={() => void submitResetPassword()} type="button">
                    {busy ? "Please wait..." : "Reset Password"}
                  </button>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="authFormGrid">
                {mode === "register" ? (
                  <label className="inputGroup">
                    <span>Display Name</span>
                    <div className="authDisplayNameRow">
                      <input
                        autoComplete="nickname"
                        onChange={(event) => {
                          setDisplayName(event.target.value);
                          setFieldErrors((current) => ({ ...current, displayName: undefined }));
                        }}
                        value={displayName}
                      />
                      <button
                        aria-label="Generate random display name"
                        className="authIconButton"
                        onClick={rerollDisplayName}
                        title="Generate random display name"
                        type="button"
                      >
                        <svg aria-hidden="true" viewBox="0 0 24 24">
                          <rect x="5" y="5" width="14" height="14" rx="3" />
                          <circle cx="9" cy="9" r="1" />
                          <circle cx="15" cy="9" r="1" />
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="9" cy="15" r="1" />
                          <circle cx="15" cy="15" r="1" />
                        </svg>
                      </button>
                    </div>
                    {fieldErrors.displayName ? <small className="authFieldError">{fieldErrors.displayName}</small> : null}
                  </label>
                ) : null}

                <label className="inputGroup">
                  <span>Email</span>
                  <input
                    autoComplete="email"
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setEmailNotFound(false);
                      setFieldErrors((current) => ({ ...current, email: undefined }));
                    }}
                    type="email"
                    value={email}
                  />
                  {fieldErrors.email ? (
                    <small className="authFieldError">
                      {fieldErrors.email}
                      {emailNotFound ? (
                        <button className="authInlineAction" onClick={() => switchMode("register")} type="button">
                          Create account
                        </button>
                      ) : null}
                    </small>
                  ) : null}
                </label>

                <label className="inputGroup authPasswordField">
                  <span>Password</span>
                  <div className="authPasswordInputWrap">
                    <input
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setFieldErrors((current) => ({ ...current, password: undefined }));
                      }}
                      type={showPassword ? "text" : "password"}
                      value={password}
                    />
                    <button
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="authPasswordToggle"
                      onClick={() => setShowPassword((current) => !current)}
                      title={showPassword ? "Hide password" : "Show password"}
                      type="button"
                    >
                      {renderPasswordToggleIcon()}
                    </button>
                  </div>
                  {fieldErrors.password ? <small className="authFieldError">{fieldErrors.password}</small> : null}
                  {mode === "login" ? (
                    <button className="authForgotLink" onClick={() => switchMode("forgot")} type="button">
                      Forgot password?
                    </button>
                  ) : null}
                </label>
              </div>

              <button className="welcomeButton" disabled={busy} onClick={() => void submitAuth()} type="button">
                {busy ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
              </button>
            </>
          )}

          <div className="modalFeedback authFeedback">
            <strong>{error || localError || (busy ? "Authorizing..." : "Secure session or guest mode")}</strong>
            <span>
              Authenticated sessions save wallet and rounds. Guest sessions stay in this browser tab only.
            </span>
          </div>

          <button className="authSecondaryAction" disabled={busy} onClick={onContinueAsGuest} type="button">
            Continue as Guest
          </button>
        </div>
      </section>
    </div>
  );
}
