"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuthSessionDto } from "@eye/shared-types";
import { BonusEntryPreview } from "@/components/bonus-entry-preview";
import { GameStatsViewer } from "@/components/game-stats-viewer";
import { MathProfileSelector } from "@/components/math-profile-selector";
import { SafetyNote } from "@/components/safety-note";
import { WinTierPreview } from "@/components/win-tier-preview";
import styles from "./page.module.css";

type AdminSection = {
  title: string;
  description: string;
  component?: () => React.JSX.Element;
  ready: boolean;
};

const sections: AdminSection[] = [
  {
    title: "Math profile selector",
    description:
      "Switch between validated runtime profiles and inspect what changes for the player before making the profile active.",
    component: MathProfileSelector,
    ready: true
  },
  {
    title: "Game analytics",
    description: "View live session analytics, RTP drift, win distributions, and cascade behavior.",
    component: GameStatsViewer,
    ready: true
  },
  {
    title: "Win tier QA preview",
    description: "Trigger WIN, BIG, HUGE, and SUPER staging on demand for art direction and presentation checks.",
    component: WinTierPreview,
    ready: true
  },
  {
    title: "Bonus entry QA preview",
    description: "Open the bonus announcement window directly to validate composition, pacing, and copy.",
    component: BonusEntryPreview,
    ready: true
  },
  {
    title: "Symbol weights editor",
    description: "Modify symbol frequencies and rarity once authenticated operator editing is enabled in Phase 2.",
    ready: false
  },
  {
    title: "Paytable editor",
    description: "Adjust payout values per symbol family and threshold after audit logging is in place.",
    ready: false
  },
  {
    title: "Audit log viewer",
    description: "Review profile switches, operator actions, and future editor writes in one operator trail.",
    ready: false
  }
] as const;

export default function AdminPage() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3200";
  const [session, setSession] = useState<AuthSessionDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const refreshSession = useCallback(async () => {
    const response = await fetch(`${apiBase}/auth/me`, {
      cache: "no-store",
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error(`Failed to verify session (${response.status})`);
    }

    const nextSession = (await response.json()) as AuthSessionDto;
    setSession(nextSession);
  }, [apiBase]);

  useEffect(() => {
    let disposed = false;

    const loadSession = async () => {
      try {
        setLoading(true);
        setError("");
        await refreshSession();
      } catch (nextError) {
        if (!disposed) {
          setError(nextError instanceof Error ? nextError.message : "Failed to load admin session.");
          setSession({ authenticated: false, user: null });
        }
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    };

    void loadSession();
    return () => {
      disposed = true;
    };
  }, [refreshSession]);

  const submitLogin = async () => {
    try {
      setBusy(true);
      setError("");

      const response = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
        const message = Array.isArray(payload?.message)
          ? payload?.message.join(", ")
          : payload?.message ?? `Login failed (${response.status})`;
        throw new Error(message);
      }

      await refreshSession();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Admin login failed.");
    } finally {
      setBusy(false);
    }
  };

  const submitLogout = async () => {
    try {
      setBusy(true);
      await fetch(`${apiBase}/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
      setSession({ authenticated: false, user: null });
    } finally {
      setBusy(false);
    }
  };

  const isAdmin = session?.authenticated && session.user?.role === "admin";

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <p className={styles.eyebrow}>Internal Tools</p>
          <h1 className={styles.heading}>The Eye in the Sky Admin</h1>
          <p className={styles.intro}>Loading authenticated operator session...</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <p className={styles.eyebrow}>Internal Tools</p>
          <h1 className={styles.heading}>The Eye in the Sky Admin</h1>
          <p className={styles.intro}>
            Operator tools are now protected behind server-backed admin authentication.
          </p>

          <section className={styles.authCard}>
            <div className={styles.sectionMeta}>
              <span className={styles.sectionStatus}>Admin Login</span>
              <h2 className={styles.sectionTitle}>Authenticated Operator Access</h2>
              <p className={styles.sectionDescription}>
                Sign in with the seeded admin credentials to access live profile switching and analytics.
              </p>
            </div>

            <div className={styles.authForm}>
              <label className={styles.authField}>
                <span>Email</span>
                <input onChange={(event) => setEmail(event.target.value)} type="email" value={email} />
              </label>
              <label className={styles.authField}>
                <span>Password</span>
                <input onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
              </label>
            </div>

            <div className={styles.authFooter}>
              <div className={styles.authMessage}>
                {session?.authenticated && session.user?.role !== "admin" && session.user
                  ? `Logged in as ${session.user.email}, but this account is not an admin.`
                  : error || "Admin-only tools are hidden until authentication succeeds."}
              </div>
              <button className={styles.authButton} disabled={busy} onClick={() => void submitLogin()} type="button">
                {busy ? "Signing in..." : "Login"}
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.headerRow}>
          <div>
            <p className={styles.eyebrow}>Internal Tools</p>
            <h1 className={styles.heading}>The Eye in the Sky Admin</h1>
          </div>
          <div className={styles.operatorBadgeRow}>
            <span className={styles.operatorBadge}>{session?.user?.email}</span>
            <button className={styles.logoutButton} disabled={busy} onClick={() => void submitLogout()} type="button">
              Logout
            </button>
          </div>
        </div>
        <p className={styles.intro}>
          Operator shell for runtime profile management, analytics review, and QA previews. Profile switching is live
          and now requires authenticated admin ownership. Destructive editors stay locked until Phase 2.
        </p>

        <div className={styles.sectionGrid}>
          {sections.map((section) => (
            <section
              className={`${styles.sectionCard} ${section.ready ? "" : styles.sectionCardPlanned}`}
              key={section.title}
            >
              <div className={styles.sectionMeta}>
                <span className={`${styles.sectionStatus} ${section.ready ? "" : styles.sectionStatusPlanned}`}>
                  {section.ready ? "Ready" : "Phase 2"}
                </span>
                <h2 className={styles.sectionTitle}>{section.title}</h2>
                <p className={styles.sectionDescription}>{section.description}</p>
              </div>

              {section.component ? (
                <div className={styles.sectionBody}>
                  <section.component />
                </div>
              ) : (
                <div className={styles.plannedNotice}>
                  Coming in Phase 2. Requires authenticated editing plus server-side audit logging.
                </div>
              )}
            </section>
          ))}
        </div>

        <SafetyNote />
      </div>
    </main>
  );
}
