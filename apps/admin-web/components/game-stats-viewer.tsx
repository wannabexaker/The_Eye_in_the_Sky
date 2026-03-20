"use client";

import { useEffect, useState } from "react";

interface GameStats {
  totalSpins: number;
  totalWagered: number;
  totalReturned: number;
  observedRtp: number;
  hitRate: number;
  averageBonusFrequency: number;
  totalBonusTriggersObserved: number;
}

export function GameStatsViewer() {
  const [stats, setStats] = useState<GameStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError("");
        // Placeholder for future stats endpoint
        // For now, show info about what would be tracked
        setStats({
          totalSpins: 0,
          totalWagered: 0,
          totalReturned: 0,
          observedRtp: 0,
          hitRate: 0,
          averageBonusFrequency: 0,
          totalBonusTriggersObserved: 0
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return <div style={{ color: "#bda98d" }}>Loading analytics...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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

      <div
        style={{
          background: "rgba(60, 40, 30, 0.3)",
          padding: 12,
          borderRadius: 8,
          color: "#bda98d",
          fontSize: 12
        }}
      >
        <p style={{ margin: 0 }}>
          📊 <strong>Read-only analytics panel.</strong> Tracks game performance metrics across active sessions.
        </p>
        <p style={{ margin: "8px 0 0" }}>Metrics reset on Phase 2 deployment (backend persistence).</p>
      </div>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "rgba(40, 30, 25, 0.5)", padding: 12, borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: 11, color: "#c6933c" }}>TOTAL SPINS</p>
            <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: "bold" }}>
              {stats.totalSpins.toLocaleString()}
            </p>
          </div>
          <div style={{ background: "rgba(40, 30, 25, 0.5)", padding: 12, borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: 11, color: "#c6933c" }}>OBSERVED RTP</p>
            <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: "bold" }}>
              {stats.observedRtp > 0 ? `${(stats.observedRtp * 100).toFixed(2)}%` : "—"}
            </p>
          </div>
          <div style={{ background: "rgba(40, 30, 25, 0.5)", padding: 12, borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: 11, color: "#c6933c" }}>HIT RATE</p>
            <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: "bold" }}>
              {stats.hitRate > 0 ? `${(stats.hitRate * 100).toFixed(2)}%` : "—"}
            </p>
          </div>
          <div style={{ background: "rgba(40, 30, 25, 0.5)", padding: 12, borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: 11, color: "#c6933c" }}>BONUS TRIGGERS</p>
            <p style={{ margin: "4px 0 0", fontSize: 18, fontWeight: "bold" }}>
              {stats.totalBonusTriggersObserved.toLocaleString()}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
