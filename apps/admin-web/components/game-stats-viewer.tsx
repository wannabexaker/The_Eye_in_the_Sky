/*
Purpose: shows game analytics availability and tracked metrics for admin QA
Layer: frontend (admin-web)
Phase 2: replace with API-driven live aggregations from server-side sessions
*/

"use client";

import { useEffect, useMemo, useState } from "react";

const TRACKED_METRICS = [
  "Total spins, wagered, returned, net P/L",
  "Observed RTP vs 95.5% target (running & final)",
  "Hit rate and winning spin count",
  "Win tier distribution: LOSS / WIN / BIG / HUGE / SUPER",
  "Bonus trigger frequency (1:N rate)",
  "Cascade depth histogram (0–8+ per spin)",
  "Balance curve over last 500 rounds",
  "Peak win amount and multiplier",
  "CSV export: all rounds with full round metadata"
];

type LiveAnalyticsSummary = {
  totalRounds: number;
  totalWagered: number;
  totalReturned: number;
  totalNet: number;
  observedRtp: number;
  hitRate: number;
  bonusTriggerRate: number;
  avgCascades: number;
  peakWin: number;
  peakMultiple: number;
  tierDistribution: {
    loss: number;
    win: number;
    big_win: number;
    huge_win: number;
    super_win: number;
  };
};

type LiveAnalyticsDashboard = {
  summary: LiveAnalyticsSummary;
  rtpSeries: Array<{ spin: number; rtp: number }>;
  balanceSeries: Array<{ spin: number; balance: number }>;
  cascadeHistogram: Array<{ cascades: string; count: number }>;
  tierDistribution: LiveAnalyticsSummary["tierDistribution"];
};

const toPct = (value: number) => `${(value * 100).toFixed(2)}%`;
const toEur = (value: number) => `EUR ${value.toFixed(2)}`;

function LineChart({
  title,
  points,
  color,
  yFormatter
}: {
  title: string;
  points: Array<{ spin: number; value: number }>;
  color: string;
  yFormatter: (value: number) => string;
}) {
  const W = 520;
  const H = 150;
  const PAD = { t: 16, r: 20, b: 26, l: 48 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;

  if (points.length < 2) {
    return (
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", padding: "10px 0" }}>
        Not enough rounds yet.
      </div>
    );
  }

  const yMin = Math.min(...points.map((entry) => entry.value));
  const yMax = Math.max(...points.map((entry) => entry.value));
  const yRange = yMax - yMin || 1;

  const x = (index: number) => PAD.l + (index / Math.max(points.length - 1, 1)) * iW;
  const y = (value: number) => PAD.t + (1 - (value - yMin) / yRange) * iH;
  const path = points.map((entry, index) => `${x(index).toFixed(2)},${y(entry.value).toFixed(2)}`).join(" ");

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 10 }}>
      <p style={{ margin: "0 0 8px", fontSize: 10, color: "#c6933c", letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {title}
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        <line x1={PAD.l} x2={W - PAD.r} y1={PAD.t + iH} y2={PAD.t + iH} stroke="rgba(255,255,255,0.12)" strokeWidth={0.6} />
        <polyline points={path} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
        <text x={PAD.l - 6} y={PAD.t + 4} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.35)">{yFormatter(yMax)}</text>
        <text x={PAD.l - 6} y={PAD.t + iH + 4} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.35)">{yFormatter(yMin)}</text>
      </svg>
    </div>
  );
}

function BarChart({
  title,
  bars,
  color
}: {
  title: string;
  bars: Array<{ label: string; value: number }>;
  color: string;
}) {
  const max = Math.max(...bars.map((entry) => entry.value), 1);

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 10 }}>
      <p style={{ margin: "0 0 8px", fontSize: 10, color: "#c6933c", letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {title}
      </p>
      <div style={{ display: "grid", gap: 6 }}>
        {bars.map((bar) => (
          <div key={bar.label} style={{ display: "grid", gridTemplateColumns: "48px 1fr 48px", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.42)" }}>{bar.label}</span>
            <div style={{ height: 10, background: "rgba(255,255,255,0.06)", borderRadius: 999 }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.max(2, (bar.value / max) * 100)}%`,
                  background: color,
                  borderRadius: 999
                }}
              />
            </div>
            <span style={{ fontSize: 10, color: "#f8edd9", textAlign: "right" }}>{bar.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GameStatsViewer() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3200";
  const [dashboard, setDashboard] = useState<LiveAnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        setOffline(false);

        const response = await fetch(`${apiBase}/analytics/dashboard?limit=5000`);
        if (!response.ok) {
          throw new Error("summary fetch failed");
        }

        const data = (await response.json()) as LiveAnalyticsDashboard;
        setDashboard(data);
      } catch {
        setOffline(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
    const timer = window.setInterval(fetchSummary, 5000);
    return () => window.clearInterval(timer);
  }, [apiBase]);

  const summary = dashboard?.summary ?? null;

  const totalWins = useMemo(() => {
    if (!summary) {
      return 0;
    }

    return (
      summary.tierDistribution.win +
      summary.tierDistribution.big_win +
      summary.tierDistribution.huge_win +
      summary.tierDistribution.super_win
    );
  }, [summary]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {offline ? (
        <div
          style={{
            background: "rgba(255, 100, 100, 0.14)",
            border: "1px solid rgba(255, 100, 100, 0.26)",
            padding: 10,
            borderRadius: 8,
            color: "#ffb1b1",
            fontSize: 12
          }}
        >
          API unreachable at {apiBase}. Live analytics disabled.
        </div>
      ) : null}

      {loading ? (
        <div style={{ color: "#bda98d", fontSize: 12 }}>Loading live analytics...</div>
      ) : summary ? (
        <>
          <div
            style={{
              background: "rgba(22, 14, 20, 0.75)",
              border: "1px solid rgba(240,202,114,0.2)",
              borderRadius: 10,
              padding: 12,
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 8
            }}
          >
          <div style={{ fontSize: 11, color: "#c6933c" }}>Rounds</div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#f8edd9" }}>{summary.totalRounds.toLocaleString()}</div>

          <div style={{ fontSize: 11, color: "#c6933c" }}>Observed RTP</div>
          <div style={{ textAlign: "right", fontSize: 12, color: summary.observedRtp >= 0.94 ? "#f0ca72" : "#ff9b9b" }}>{toPct(summary.observedRtp)}</div>

          <div style={{ fontSize: 11, color: "#c6933c" }}>Total Wagered</div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#f8edd9" }}>{toEur(summary.totalWagered)}</div>

          <div style={{ fontSize: 11, color: "#c6933c" }}>Total Returned</div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#f8edd9" }}>{toEur(summary.totalReturned)}</div>

          <div style={{ fontSize: 11, color: "#c6933c" }}>Net P/L</div>
          <div style={{ textAlign: "right", fontSize: 12, color: summary.totalNet >= 0 ? "#f0ca72" : "#ff9b9b" }}>
            {summary.totalNet >= 0 ? "+" : ""}{toEur(summary.totalNet)}
          </div>

          <div style={{ fontSize: 11, color: "#c6933c" }}>Hit Rate</div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#f8edd9" }}>{toPct(summary.hitRate)} ({totalWins} wins)</div>

          <div style={{ fontSize: 11, color: "#c6933c" }}>Bonus Trigger Rate</div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#f8edd9" }}>{toPct(summary.bonusTriggerRate)}</div>

          <div style={{ fontSize: 11, color: "#c6933c" }}>Avg Cascades</div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#f8edd9" }}>{summary.avgCascades.toFixed(2)}</div>

          <div style={{ fontSize: 11, color: "#c6933c" }}>Peak Win</div>
          <div style={{ textAlign: "right", fontSize: 12, color: "#f8edd9" }}>
            {toEur(summary.peakWin)} (x{summary.peakMultiple.toFixed(2)})
          </div>
          </div>

          {dashboard ? (
            <div style={{ display: "grid", gap: 10 }}>
              <LineChart
                title="Running RTP"
                points={dashboard.rtpSeries.map((entry) => ({ spin: entry.spin, value: entry.rtp }))}
                color="#d2a04c"
                yFormatter={(value) => `${(value * 100).toFixed(1)}%`}
              />

              <LineChart
                title="Balance Curve"
                points={dashboard.balanceSeries.map((entry) => ({ spin: entry.spin, value: entry.balance }))}
                color="#8cb5ff"
                yFormatter={(value) => `${value.toFixed(0)}`}
              />

              <BarChart
                title="Cascade Histogram"
                bars={dashboard.cascadeHistogram.map((entry) => ({ label: entry.cascades, value: entry.count }))}
                color="#af8040"
              />

              <BarChart
                title="Win Tier Distribution"
                bars={[
                  { label: "LOSS", value: summary.tierDistribution.loss },
                  { label: "WIN", value: summary.tierDistribution.win },
                  { label: "BIG", value: summary.tierDistribution.big_win },
                  { label: "HUGE", value: summary.tierDistribution.huge_win },
                  { label: "SUPER", value: summary.tierDistribution.super_win }
                ]}
                color="#d35f5f"
              />
            </div>
          ) : null}
        </>
      ) : null}

      <div
        style={{
          background: "rgba(30, 20, 10, 0.5)",
          border: "1px solid rgba(240,202,114,0.18)",
          padding: 14,
          borderRadius: 10,
          fontSize: 12,
          color: "#bda98d",
          lineHeight: 1.55
        }}
      >
        <p style={{ margin: 0, fontWeight: 700, color: "#f0ca72", fontSize: 13 }}>
          📊 Session Analytics — In-game access
        </p>
        <p style={{ margin: "8px 0 0" }}>
          Analytics are tracked per-session inside the player app (localStorage,
          up to 1,000 rounds). To access live charts and export:
        </p>
        <ol style={{ margin: "8px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
          <li>Open the game at <strong>localhost:3000</strong></li>
          <li>Open <strong>Settings</strong> (bottom control bar)</li>
          <li>Tap <strong>Open Session Analytics</strong></li>
        </ol>
      </div>

      <div
        style={{
          background: "rgba(22, 14, 20, 0.6)",
          border: "1px solid rgba(255,255,255,0.06)",
          padding: 12,
          borderRadius: 8
        }}
      >
        <p
          style={{
            margin: "0 0 8px",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#c6933c"
          }}
        >
          Tracked Metrics (Phase 1)
        </p>
        {TRACKED_METRICS.map((m) => (
          <p key={m} style={{ margin: "3px 0", fontSize: 11, color: "#8a7060" }}>
            • {m}
          </p>
        ))}
      </div>

      <div
        style={{
          background: "rgba(22, 14, 20, 0.4)",
          border: "1px solid rgba(255,255,255,0.04)",
          padding: 12,
          borderRadius: 8,
          fontSize: 11,
          color: "rgba(255,255,255,0.22)",
          lineHeight: 1.5
        }}
      >
        <strong style={{ color: "rgba(255,255,255,0.35)" }}>Phase 2 upgrade:</strong> Replace
        localStorage per-session log with server-side aggregation via API. Admin panel will show
        cross-session stats, daily/weekly cohorts, and operator-level RTP tracking.
      </div>
    </div>
  );
}
