import { useEffect, useRef, useState } from "react";
import { generateRandomDisplayName } from "@/lib/identity/random-display-name";
import type { PlayerApiFieldErrors } from "@/lib/api/player-api";

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
      theme?: "auto" | "light" | "dark";
      appearance?: "always" | "execute" | "interaction-only";
    }
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let turnstileScriptPromise: Promise<void> | null = null;

type AuthEntryMode = "login" | "register";
type AuthOverlayMode = AuthEntryMode | "forgot" | "reset";

const loadTurnstileScript = (): Promise<void> => {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.turnstile) {
    return Promise.resolve();
  }
  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      turnstileScriptPromise = null;
      reject(new Error("Failed to load Turnstile script."));
    };
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
};

type AuthOverlayProps = {
  allowSkipLogin: boolean;
  busy: boolean;
  error: string;
  errorCode?: string;
  fieldErrors?: PlayerApiFieldErrors;
  initialMode?: AuthEntryMode;
  onForgotPassword: (payload: { email: string }) => Promise<{ ok: boolean; resetToken?: string }>;
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
  onRegister: (payload: {
    email: string;
    password: string;
    displayName: string;
    turnstileToken?: string;
  }) => Promise<void>;
  onClose?: () => void;
  onResetPassword: (payload: { token: string; newPassword: string }) => Promise<void>;
  onSkipLogin: () => void;
  logoSrc?: string;
  turnstileSiteKey?: string | null;
};

export function AuthOverlay({
  allowSkipLogin,
  busy,
  error,
  errorCode,
  fieldErrors = {},
  initialMode = "login",
  onClose,
  onForgotPassword,
  onLogin,
  onRegister,
  onResetPassword,
  onSkipLogin,
  logoSrc = "/assets/ui/logo-eye-in-the-sky.png",
  turnstileSiteKey = null
}: AuthOverlayProps) {
  const [mode, setMode] = useState<AuthOverlayMode>(() => initialMode);
  const [displayName, setDisplayName] = useState(() => generateRandomDisplayName());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [devResetHint, setDevResetHint] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);

  const turnstileRequired = Boolean(turnstileSiteKey);

  useEffect(() => {
    setMode(initialMode);
    setLocalError("");
  }, [initialMode]);

  // Render the Turnstile widget while on the register tab. It is invisible/managed
  // and produces a one-time token the API verifies. No-op when no site key.
  useEffect(() => {
    if (mode !== "register" || !turnstileSiteKey) {
      return;
    }

    let cancelled = false;
    setTurnstileToken("");

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !turnstileContainerRef.current || !window.turnstile) {
          return;
        }
        turnstileContainerRef.current.innerHTML = "";
        turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: turnstileSiteKey,
          theme: "dark",
          callback: (token) => setTurnstileToken(token),
          "error-callback": () => setTurnstileToken(""),
          "expired-callback": () => setTurnstileToken("")
        });
      })
      .catch(() => {
        if (!cancelled) {
          setLocalError("Could not load verification. Refresh and try again.");
        }
      });

    return () => {
      cancelled = true;
      if (turnstileWidgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetIdRef.current);
        } catch {
          // widget already gone
        }
      }
      turnstileWidgetIdRef.current = null;
    };
  }, [mode, turnstileSiteKey]);

  const resetTurnstile = () => {
    setTurnstileToken("");
    if (turnstileWidgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(turnstileWidgetIdRef.current);
      } catch {
        // ignore
      }
    }
  };

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

    if (turnstileRequired && !turnstileToken) {
      setLocalError("Please complete the verification below.");
      return;
    }

    await onRegister({
      email,
      password,
      displayName: displayName.trim() || generateRandomDisplayName(),
      ...(turnstileToken ? { turnstileToken } : {})
    });
  };

  const runSubmit = async () => {
    try {
      await submit();
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Authentication failed.");
      // Token is single-use — reset so the user can retry after a failed submit.
      if (mode === "register" && turnstileRequired) {
        resetTurnstile();
      }
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
  const registerValueCopy = "Save your progress, wallet, and bonuses across devices.";

  return (
    <div className="overlayBackdrop welcomeBackdrop" role="presentation">
      <section aria-label="Authentication" className="overlayModal welcomeModal authModal">
        <header className={`overlayHeader welcomeHeader authHeader ${onClose ? "is-dismissible" : ""}`}>
          <div className="welcomeLogoStack">
            <div
              aria-hidden="true"
              className="welcomeLogo"
              style={{ backgroundImage: `url(${logoSrc})` }}
            />
            <div className="overlayTitleBlock welcomeTitleBlock">
              <h2>{title}</h2>
              <span className="overlayEyebrow">
                {onClose ? "Save progress with a real account" : "Server-backed session required"}
              </span>
            </div>
          </div>
          {onClose ? (
            <button
              aria-label="Close create account prompt"
              className="authCloseButton"
              onClick={onClose}
              title="Maybe later"
              type="button"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </svg>
            </button>
          ) : null}
        </header>

        <div className="overlayBody welcomeBody authBody">
          <p className="welcomeTagline">
            {mode === "login"
              ? "Sign in to restore wallet, rounds, and active bonus state."
              : mode === "register"
                ? registerValueCopy
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
              {onClose && mode === "register"
                ? "Guest play stays available until you submit this form."
                : "First rollout persists wallet, rounds, welcome bonus, and resumable session state on the API."}
            </span>
          </div>

          {mode === "register" && turnstileSiteKey ? (
            <div className="authTurnstile" ref={turnstileContainerRef} />
          ) : null}

          <button className="welcomeButton" disabled={busy} onClick={() => void runSubmit()} type="button">
            {busy ? "Please wait..." : primaryLabel}
          </button>

          {onClose ? (
            <button className="authInlineAction authMaybeLaterAction" onClick={onClose} type="button">
              Maybe later
            </button>
          ) : null}

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
