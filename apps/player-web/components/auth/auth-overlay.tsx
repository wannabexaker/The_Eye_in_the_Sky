import { useState } from "react";
import { generateRandomDisplayName } from "@/lib/identity/random-display-name";
import type { PlayerApiFieldErrors } from "@/lib/api/player-api";

type AuthOverlayProps = {
  allowSkipLogin: boolean;
  busy: boolean;
  error: string;
  errorCode?: string;
  fieldErrors?: PlayerApiFieldErrors;
  onForgotPassword: (payload: { email: string }) => Promise<{ ok: boolean; resetToken?: string }>;
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
  onRegister: (payload: { email: string; password: string; displayName: string }) => Promise<void>;
  onResetPassword: (payload: { token: string; newPassword: string }) => Promise<void>;
  onSkipLogin: () => void;
  logoSrc?: string;
};

export function AuthOverlay({
  allowSkipLogin,
  busy,
  error,
  errorCode,
  fieldErrors = {},
  onForgotPassword,
  onLogin,
  onRegister,
  onResetPassword,
  onSkipLogin,
  logoSrc = "/assets/ui/logo-eye-in-the-sky.png"
}: AuthOverlayProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot" | "reset">("login");
  const [displayName, setDisplayName] = useState(() => generateRandomDisplayName());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [devResetHint, setDevResetHint] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const submit = async () => {
    if (mode === "forgot") {
      if (!email.trim()) {
        setLocalError("Email is required.");
        return;
      }

      setLocalError("");
      const result = await onForgotPassword({ email });
      if (result.resetToken) {
        setResetToken(result.resetToken);
        setDevResetHint("Reset token auto-filled (dev only).");
        setMode("reset");
        return;
      }

      setLocalError("If the account exists, a reset token has been issued.");
      setMode("reset");
      return;
    }

    if (mode === "reset") {
      if (!resetToken.trim() || !newPassword.trim()) {
        setLocalError("Reset token and new password are required.");
        return;
      }

      setLocalError("");
      await onResetPassword({ token: resetToken, newPassword });
      setPassword(newPassword);
      setNewPassword("");
      setResetToken("");
      setDevResetHint("");
      setMode("login");
      setLocalError("Password reset complete. Login with the new password.");
      return;
    }

    if (!email.trim() || !password.trim()) {
      setLocalError("Email and password are required.");
      return;
    }

    setLocalError("");
    if (mode === "login") {
      await onLogin({ email, password });
      return;
    }

    await onRegister({
      email,
      password,
      displayName: displayName.trim() || generateRandomDisplayName()
    });
  };

  const runSubmit = async () => {
    try {
      await submit();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Authentication failed.");
    }
  };

  const switchToRegisterWithEmail = () => {
    setMode("register");
    if (!displayName.trim()) {
      setDisplayName(generateRandomDisplayName());
    }
    setLocalError("");
  };

  const title =
    mode === "login"
      ? "Temple Login"
      : mode === "register"
        ? "Create Player Account"
        : mode === "forgot"
          ? "Forgot Password"
          : "Reset Password";

  const primaryLabel =
    mode === "login"
      ? "Login"
      : mode === "register"
        ? "Create Account"
        : mode === "forgot"
          ? "Issue Reset Token"
          : "Reset Password";

  const emailError = fieldErrors.email || (mode === "login" && errorCode === "EMAIL_NOT_FOUND" ? error : "");
  const passwordError = fieldErrors.password || (mode === "login" && errorCode === "WRONG_PASSWORD" ? error : "");
  const displayNameError = fieldErrors.displayName;
  const resetTokenError = fieldErrors.token;
  const newPasswordError = fieldErrors.newPassword;

  return (
    <div className="overlayBackdrop welcomeBackdrop" role="presentation">
      <section aria-label="Authentication" className="overlayModal welcomeModal authModal">
        <header className="overlayHeader welcomeHeader">
          <div className="welcomeLogoStack">
            <div
              aria-hidden="true"
              className="welcomeLogo"
              style={{ backgroundImage: `url(${logoSrc})` }}
            />
            <div className="overlayTitleBlock welcomeTitleBlock">
              <h2>{title}</h2>
              <span className="overlayEyebrow">Server-backed session required</span>
            </div>
          </div>
        </header>

        <div className="overlayBody welcomeBody authBody">
          <p className="welcomeTagline">
            {mode === "login"
              ? "Sign in to restore wallet, rounds, and active bonus state."
              : mode === "register"
                ? "Register a new player profile with secure cookie-based sessions."
                : mode === "forgot"
                  ? "Enter the account email to issue a reset token."
                  : "Paste the reset token and choose a new password."}
          </p>

          <div className="authToggleRow">
            <button
              className={`controlChip ${mode === "login" ? "is-active" : ""}`}
              onClick={() => setMode("login")}
              type="button"
            >
              Login
            </button>
            <button
              className={`controlChip ${mode === "register" ? "is-active" : ""}`}
              onClick={() => setMode("register")}
              type="button"
            >
              Register
            </button>
          </div>

          <div className="authFormGrid">
            {mode === "register" ? (
              <label className="inputGroup">
                <span>Display Name</span>
                <div className="authNameInputWrap">
                  <input
                    autoComplete="nickname"
                    onChange={(event) => setDisplayName(event.target.value)}
                    value={displayName}
                  />
                  <button
                    aria-label="Generate random display name"
                    className="authDiceButton"
                    onClick={() => setDisplayName(generateRandomDisplayName())}
                    title="Generate random display name"
                    type="button"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <rect height="16" rx="3" width="16" x="4" y="4" />
                      <circle cx="9" cy="9" r="1" />
                      <circle cx="15" cy="9" r="1" />
                      <circle cx="12" cy="12" r="1" />
                      <circle cx="9" cy="15" r="1" />
                      <circle cx="15" cy="15" r="1" />
                    </svg>
                  </button>
                </div>
                {displayNameError ? <small className="authFieldError">{displayNameError}</small> : null}
              </label>
            ) : null}

            {mode === "reset" ? (
              <label className="inputGroup">
                <span>Reset Token</span>
                <input
                  autoComplete="one-time-code"
                  onChange={(event) => setResetToken(event.target.value)}
                  value={resetToken}
                />
                {devResetHint ? <small className="authDevHint">{devResetHint}</small> : null}
                {resetTokenError ? <small className="authFieldError">{resetTokenError}</small> : null}
              </label>
            ) : null}

            <label className="inputGroup">
              <span>Email</span>
              <input
                autoComplete="email"
                disabled={mode === "reset"}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
              {emailError ? <small className="authFieldError">{emailError}</small> : null}
            </label>

            {mode !== "forgot" ? (
              <label className="inputGroup authPasswordField">
                <span>{mode === "reset" ? "New Password" : "Password"}</span>
                <div className="authPasswordInputWrap">
                  <input
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    onChange={(event) =>
                      mode === "reset"
                        ? setNewPassword(event.target.value)
                        : setPassword(event.target.value)
                    }
                    type={showPassword ? "text" : "password"}
                    value={mode === "reset" ? newPassword : password}
                  />
                  <button
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="authPasswordToggle"
                    onClick={() => setShowPassword((current) => !current)}
                    title={showPassword ? "Hide password" : "Show password"}
                    type="button"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24">
                      <path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6Z" />
                      <circle cx="12" cy="12" r="3.2" />
                    </svg>
                  </button>
                </div>
                {mode === "reset"
                  ? newPasswordError ? <small className="authFieldError">{newPasswordError}</small> : null
                  : passwordError ? <small className="authFieldError">{passwordError}</small> : null}
              </label>
            ) : null}
          </div>

          {mode === "login" && errorCode === "EMAIL_NOT_FOUND" ? (
            <button className="authInlineAction" onClick={switchToRegisterWithEmail} type="button">
              Create account with this email
            </button>
          ) : null}

          <div className="modalFeedback authFeedback">
            <strong>{error || localError || (busy ? "Authorizing..." : "Secure session required")}</strong>
            <span>
              First rollout persists wallet, rounds, welcome bonus, and resumable session state on the API.
            </span>
          </div>

          <button className="welcomeButton" disabled={busy} onClick={() => void runSubmit()} type="button">
            {busy ? "Please wait..." : primaryLabel}
          </button>

          {mode === "login" ? (
            <button className="authInlineAction" disabled={busy} onClick={() => setMode("forgot")} type="button">
              Forgot password?
            </button>
          ) : null}

          {allowSkipLogin ? (
            <button className="authSecondaryAction" disabled={busy} onClick={onSkipLogin} type="button">
              Continue as Guest
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
