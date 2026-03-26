"use client";

import { useEffect, useState } from "react";

interface GameConfigProfile {
  id: string;
  label: string;
  version: string;
  isLegacy: boolean;
  targetRtp: number;
  volatility: string;
}

interface GameConfigState {
  activeProfileId: string;
  activeConfig: {
    version: string;
    targetRtp: number;
    volatility: string;
    rows: number;
    cols: number;
    bonusMeterTarget: number;
    bonusSpinsAwarded: number;
  };
}

const FALLBACK_PROFILES: GameConfigProfile[] = [
  {
    id: "legacy_v1_3",
    label: "Legacy Math v1.3",
    version: "eye-sky-math-v1.3",
    isLegacy: true,
    targetRtp: 0.955,
    volatility: "medium"
  },
  {
    id: "math_base_v2_0",
    label: "Math Base v2.0",
    version: "eye-sky-math-v2.0",
    isLegacy: false,
    targetRtp: 0.954,
    volatility: "medium"
  },
  {
    id: "constellation_simple_v0_1",
    label: "Constellation Simple v0.1",
    version: "eye-sky-constellation-v0.1",
    isLegacy: false,
    targetRtp: 0.952,
    volatility: "high"
  }
];

const FALLBACK_STATE: GameConfigState = {
  activeProfileId: "math_base_v2_0",
  activeConfig: {
    version: "eye-sky-math-v2.0",
    targetRtp: 0.954,
    volatility: "medium",
    rows: 5,
    cols: 6,
    bonusMeterTarget: 17,
    bonusSpinsAwarded: 8
  }
};

export function MathProfileSelector() {
  const [profiles, setProfiles] = useState<GameConfigProfile[]>([]);
  const [activeState, setActiveState] = useState<GameConfigState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3200";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        setOfflineMode(false);

        const [profilesRes, stateRes] = await Promise.all([
          fetch(`${apiBase}/game-config/profiles`),
          fetch(`${apiBase}/game-config`)
        ]);

        if (!profilesRes.ok || !stateRes.ok) {
          throw new Error("Failed to fetch config data");
        }

        const profilesData = await profilesRes.json();
        const stateData = await stateRes.json();

        setProfiles(profilesData);
        setActiveState(stateData);
      } catch (err) {
        setProfiles(FALLBACK_PROFILES);
        setActiveState(FALLBACK_STATE);
        setOfflineMode(true);
        setError("API unreachable. Running in local preview mode.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiBase]);

  const selectProfile = async (profileId: string) => {
    if (offlineMode) {
      setActiveState((current) => {
        const profile = FALLBACK_PROFILES.find((entry) => entry.id === profileId) ?? FALLBACK_PROFILES[1];
        return {
          activeProfileId: profile.id,
          activeConfig: {
            ...FALLBACK_STATE.activeConfig,
            version: profile.version,
            targetRtp: profile.targetRtp,
            volatility: profile.volatility,
            bonusMeterTarget: profile.id === "legacy_v1_3" ? 16 : 17,
            bonusSpinsAwarded: profile.id === "constellation_simple_v0_1" ? 7 : 8
          }
        };
      });
      return;
    }

    try {
      setSelecting(true);
      setError("");

      const res = await fetch(`${apiBase}/game-config/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId })
      });

      if (!res.ok) {
        throw new Error("Failed to select profile");
      }

      const newState = await res.json();
      setActiveState(newState);
    } catch (err) {
      setError("Profile switch failed. Falling back to local preview mode.");
      setOfflineMode(true);
      setProfiles(FALLBACK_PROFILES);
      setActiveState((current) =>
        current
          ? current
          : FALLBACK_STATE
      );
    } finally {
      setSelecting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {error && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: offlineMode ? "rgba(214, 168, 84, 0.16)" : "rgba(255, 100, 100, 0.14)",
            color: offlineMode ? "#f0c886" : "#ff6464",
            fontSize: 13
          }}
        >
          {offlineMode ? "⚠️" : "❌"} {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#bda98d" }}>Loading config profiles...</p>
      ) : (
        <>
          <div style={{ display: "grid", gap: 16, gridTemplateColumns: "1fr 1fr" }}>
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => selectProfile(profile.id)}
                disabled={selecting || profile.id === activeState?.activeProfileId}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border:
                    profile.id === activeState?.activeProfileId
                      ? "2px solid #c6933c"
                      : "1px solid rgba(240, 202, 114, 0.14)",
                  background:
                    profile.id === activeState?.activeProfileId
                      ? "rgba(198, 147, 60, 0.16)"
                      : "rgba(20, 14, 18, 0.84)",
                  color: "#f8edd9",
                  cursor: selecting ? "wait" : "pointer",
                  opacity: selecting && profile.id !== activeState?.activeProfileId ? 0.5 : 1,
                  transition: "all 200ms ease"
                }}
              >
                <div style={{ textAlign: "left" }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#c6933c",
                      marginBottom: 4
                    }}
                  >
                    {profile.isLegacy ? "⚠️ LEGACY" : "✅ ACTIVE"}
                  </p>
                  <p style={{ margin: "0 0 8px", fontSize: 16, fontWeight: "bold" }}>
                    {profile.label}
                  </p>
                  <p style={{ margin: 0, fontSize: 12, color: "#bda98d" }}>
                    {profile.version}
                  </p>
                  <p style={{ margin: "8px 0 0", fontSize: 12, color: "#bda98d" }}>
                    RTP: {(profile.targetRtp * 100).toFixed(1)}% • {profile.volatility}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {activeState && (
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                border: "1px solid rgba(198, 147, 60, 0.24)",
                background: "rgba(198, 147, 60, 0.06)"
              }}
            >
              <p style={{ margin: "0 0 12px", fontSize: 12, color: "#c6933c", textTransform: "uppercase" }}>
                Active Configuration
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: "#bda98d" }}>Version</p>
                  <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: "bold", color: "#f8edd9" }}>
                    {activeState.activeConfig.version}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: "#bda98d" }}>Target RTP</p>
                  <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: "bold", color: "#f8edd9" }}>
                    {(activeState.activeConfig.targetRtp * 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: "#bda98d" }}>Board</p>
                  <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: "bold", color: "#f8edd9" }}>
                    {activeState.activeConfig.cols}×{activeState.activeConfig.rows}
                  </p>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 12, color: "#bda98d" }}>Bonus Meter</p>
                  <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: "bold", color: "#f8edd9" }}>
                    Target {activeState.activeConfig.bonusMeterTarget}, {activeState.activeConfig.bonusSpinsAwarded} Free Spins
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
