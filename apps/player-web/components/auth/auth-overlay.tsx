import { useState } from "react";
import { shellAssets } from "@/lib/assets/asset-manifest";

type AuthOverlayProps = {
  allowSkipLogin: boolean;
  busy: boolean;
  error: string;
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
  onRegister: (payload: { email: string; password: string; displayName: string }) => Promise<void>;
  onSkipLogin: () => void;
};

export function AuthOverlay({
  allowSkipLogin,
  busy,
  error,
  onLogin,
  onRegister,
  onSkipLogin
}: AuthOverlayProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [displayName, setDisplayName] = useState("Temple Initiate");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const submit = async () => {
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
      displayName: displayName.trim() || "Temple Initiate"
    });
  };

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
              <h2>{mode === "login" ? "Temple Login" : "Create Player Account"}</h2>
              <span className="overlayEyebrow">Server-backed session required</span>
            </div>
          </div>
        </header>

        <div className="overlayBody welcomeBody authBody">
          <p className="welcomeTagline">
            {mode === "login"
              ? "Sign in to restore wallet, rounds, and active bonus state."
              : "Register a new player profile with secure cookie-based sessions."}
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
                <input
                  autoComplete="nickname"
                  onChange={(event) => setDisplayName(event.target.value)}
                  value={displayName}
                />
              </label>
            ) : null}

            <label className="inputGroup">
              <span>Email</span>
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                value={email}
              />
            </label>

            <label className="inputGroup authPasswordField">
              <span>Password</span>
              <div className="authPasswordInputWrap">
                <input
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  onChange={(event) => setPassword(event.target.value)}
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
                  <svg aria-hidden="true" viewBox="0 0 24 24">
                    <path d="M2 12s3.8-6 10-6 10 6 10 6-3.8 6-10 6-10-6-10-6Z" />
                    <circle cx="12" cy="12" r="3.2" />
                  </svg>
                </button>
              </div>
            </label>
          </div>

          <div className="modalFeedback authFeedback">
            <strong>{error || localError || (busy ? "Authorizing..." : "Secure session required")}</strong>
            <span>
              First rollout persists wallet, rounds, welcome bonus, and resumable session state on the API.
            </span>
          </div>

          <button className="welcomeButton" disabled={busy} onClick={() => void submit()} type="button">
            {busy ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
          </button>

          {allowSkipLogin ? (
            <button className="authSecondaryAction" disabled={busy} onClick={onSkipLogin} type="button">
              Skip Login
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
