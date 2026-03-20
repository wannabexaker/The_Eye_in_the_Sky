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

export function MathProfileSelector() {
  const [profiles, setProfiles] = useState<GameConfigProfile[]>([]);
  const [activeState, setActiveState] = useState<GameConfigState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selecting, setSelecting] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

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
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiBase]);

  const selectProfile = async (profileId: string) => {
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
      setError(err instanceof Error ? err.message : "Unknown error");
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
            background: "rgba(255, 100, 100, 0.14)",
            color: "#ff6464",
            fontSize: 13
          }}
        >
          ⚠️ {error}
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
