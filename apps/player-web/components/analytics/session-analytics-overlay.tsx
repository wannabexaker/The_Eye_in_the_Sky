/*
Purpose: full-screen session analytics dashboard with SVG charts and CSV export
Layer: frontend (player-web)
Uses: RoundAnalyticsEntry from shared-types, player Zustand roundsLog
SQL-ready: replace roundsLog prop with API fetch when server-side persistence is added
*/

"use client";

import type { RoundAnalyticsEntry } from "@eye/shared-types";
import { useId, useMemo, useState } from "react";

const fmt2 = (n: number) => n.toFixed(2);
const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;
const fmtEur = (n: number) => `€${n.toFixed(2)}`;
const fmtNum = (n: number) => n.toLocaleString("en-US");

function computeStats(rounds: RoundAnalyticsEntry[]) {
  if (rounds.length === 0) return null;

  const totalSpins = rounds.length;
  const totalWagered = rounds.reduce((acc, r) => acc + r.bet, 0);
  const totalReturned = rounds.reduce((acc, r) => acc + r.win, 0);
  const totalNet = rounds.reduce((acc, r) => acc + r.net, 0);
  const observedRtp = totalWagered > 0 ? totalReturned / totalWagered : 0;
  const hitCount = rounds.filter((r) => r.win > 0).length;
  const hitRate = hitCount / totalSpins;
  const bonusTriggers = rounds.filter((r) => r.bonusTriggered).length;
  const bonusTriggerRate = bonusTriggers / totalSpins;
  const peakWin = Math.max(...rounds.map((r) => r.win), 0);
  const peakMultiple = Math.max(...rounds.map((r) => r.winMultiple), 0);
  const baseSpins = rounds.filter((r) => r.mode === "base").length;
  const bonusSpins = totalSpins - baseSpins;
  const avgBet = totalWagered / totalSpins;
  const avgCascades =
    rounds.reduce((acc, r) => acc + r.cascades, 0) / totalSpins;

  return {
    totalSpins,
    totalWagered,
    totalReturned,
    totalNet,
    observedRtp,
    hitCount,
    hitRate,
    bonusTriggers,
    bonusTriggerRate,
    peakWin,
    peakMultiple,
    baseSpins,
    bonusSpins,
    avgBet,
    avgCascades
  };
}

function SummaryCard({
  label,
  value,
  sub,
  accent,
  danger
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  danger?: boolean;
}) {
  const color = danger ? "#e05858" : accent ? "#f0ca72" : "#f8edd9";
  const borderAlpha = danger ? 0.2 : accent ? 0.28 : 0.1;
  return (
    <div
      style={{
        background: "rgba(22,14,20,0.8)",
        borderRadius: 10,
        padding: "10px 14px",
        border: `1px solid rgba(240,202,114,${borderAlpha})`
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 9,
          letterSpacing: "0.14em",
          color: "#c6933c",
          textTransform: "uppercase",
          fontFamily: "var(--font-display, Cinzel, serif)"
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "3px 0 0",
          fontSize: 17,
          fontWeight: 700,
          color,
          fontFamily: "var(--font-display, Cinzel, serif)"
        }}
      >
        {value}
      </p>
      {sub ? (
        <p
          style={{ margin: "2px 0 0", fontSize: 10, color: "rgba(255,255,255,0.3)" }}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}

const CHART_BG = "rgba(14,9,16,0.6)";

function RtpLineChart({ rounds }: { rounds: RoundAnalyticsEntry[] }) {
  const id = useId();
  const gradId = `rtp-grad-${id}`;

  if (rounds.length < 5) {
    return (
      <div
        style={{
          textAlign: "center",
          color: "rgba(255,255,255,0.3)",
          fontSize: 12,
          padding: "28px 0",
          background: CHART_BG,
          borderRadius: 8
        }}
      >
        Play at least 5 rounds to see the RTP trend.
      </div>
    );
  }

  const W = 580;
  const H = 150;
  const PAD = { t: 16, r: 24, b: 28, l: 52 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;

  const display = rounds.slice(-500);
  const rtps: number[] = [];
  let cumWag = 0;
  let cumRet = 0;
  for (const r of display) {
    cumWag += r.bet;
    cumRet += r.win;
    rtps.push(cumWag > 0 ? (cumRet / cumWag) * 100 : 0);
  }

  const n = rtps.length;
  const dataMin = Math.min(...rtps);
  const dataMax = Math.max(...rtps);
  const yMin = Math.max(40, dataMin - 8);
  const yMax = Math.min(200, dataMax + 8);
  const yRange = yMax - yMin || 1;

  const xP = (i: number) => PAD.l + (i / Math.max(n - 1, 1)) * iW;
  const yP = (v: number) => PAD.t + (1 - (v - yMin) / yRange) * iH;

  const linePts = rtps.map((v, i) => `${xP(i).toFixed(1)},${yP(v).toFixed(1)}`).join(" ");
  const areaPts = `${xP(0).toFixed(1)},${(PAD.t + iH).toFixed(1)} ${linePts} ${xP(n - 1).toFixed(1)},${(PAD.t + iH).toFixed(1)}`;

  const lastRtp = rtps[n - 1] ?? 0;
  const lineColor = lastRtp >= 94 ? "#c6933c" : "#e05858";
  const gridVals = [80, 90, 95.5, 100, 110].filter(
    (v) => v >= yMin - 2 && v <= yMax + 2
  );

  return (
    <div
      style={{
        background: CHART_BG,
        borderRadius: 8,
        padding: "8px 4px 4px"
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.28} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {gridVals.map((v) => (
          <line
            key={v}
            x1={PAD.l}
            x2={W - PAD.r}
            y1={yP(v)}
            y2={yP(v)}
            stroke={v === 95.5 ? "rgba(198,147,60,0.55)" : "rgba(255,255,255,0.05)"}
            strokeWidth={v === 95.5 ? 1 : 0.5}
            strokeDasharray={v === 95.5 ? "5,5" : undefined}
          />
        ))}

        {gridVals.map((v) => (
          <text
            key={v}
            x={PAD.l - 5}
            y={yP(v) + 3.5}
            textAnchor="end"
            fontSize={9}
            fill={v === 95.5 ? "#c6933c" : "rgba(255,255,255,0.28)"}
          >
            {v === 95.5 ? "TGT" : `${v}%`}
          </text>
        ))}

        <polygon points={areaPts} fill={`url(#${gradId})`} />

        <polyline
          points={linePts}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <text
          x={W - PAD.r + 3}
          y={yP(lastRtp) + 4}
          fontSize={10}
          fontWeight="bold"
          fill={lineColor}
        >
          {lastRtp.toFixed(1)}%
        </text>

        <text
          x={PAD.l}
          y={H - 3}
          fontSize={8.5}
          fill="rgba(255,255,255,0.2)"
        >
          0
        </text>
        <text
          x={W / 2}
          y={H - 3}
          textAnchor="middle"
          fontSize={8.5}
          fill="rgba(255,255,255,0.2)"
        >
          spin →
        </text>
        <text
          x={W - PAD.r}
          y={H - 3}
          textAnchor="end"
          fontSize={8.5}
          fill="rgba(255,255,255,0.2)"
        >
          {n}
        </text>
      </svg>
    </div>
  );
}

const TIER_META = [
  { key: "loss" as const, label: "LOSS", color: "#5c3535" },
  { key: "win" as const, label: "WIN", color: "#7a5e1a" },
  { key: "big_win" as const, label: "BIG WIN", color: "#c6933c" },
  { key: "huge_win" as const, label: "HUGE WIN", color: "#d84848" },
  { key: "super_win" as const, label: "SUPER WIN", color: "#e060a0" }
];

function WinTierChart({ rounds }: { rounds: RoundAnalyticsEntry[] }) {
  const total = rounds.length;
  if (total === 0) return null;

  const counts = Object.fromEntries(
    TIER_META.map((t) => [t.key, rounds.filter((r) => r.tier === t.key).length])
  ) as Record<string, number>;

  const BARH = 24;
  const GAP = 7;
  const LW = 78;
  const CW = 95;
  const W = 560;
  const H = TIER_META.length * (BARH + GAP) - GAP;
  const trackW = W - LW - CW - 8;

  return (
    <div
      style={{
        background: CHART_BG,
        borderRadius: 8,
        padding: "10px 6px"
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        {TIER_META.map((t, i) => {
          const count = counts[t.key] ?? 0;
          const pct = count / total;
          const barW = Math.max(pct > 0 ? 2 : 0, pct * trackW);
          const y = i * (BARH + GAP);

          return (
            <g key={t.key} transform={`translate(0,${y})`}>
              <text
                x={LW - 6}
                y={BARH / 2 + 3.5}
                textAnchor="end"
                fontSize={9.5}
                fill="rgba(255,255,255,0.45)"
                fontFamily="monospace"
                letterSpacing={0.5}
              >
                {t.label}
              </text>
              <rect
                x={LW}
                y={2}
                width={trackW}
                height={BARH - 4}
                fill="rgba(255,255,255,0.04)"
                rx={3}
              />
              {barW > 0 ? (
                <rect
                  x={LW}
                  y={2}
                  width={barW}
                  height={BARH - 4}
                  fill={t.color}
                  rx={3}
                  fillOpacity={0.88}
                />
              ) : null}
              <text
                x={LW + trackW + 8}
                y={BARH / 2 + 3.5}
                fontSize={9.5}
                fill="rgba(255,255,255,0.55)"
              >
                {fmtNum(count)}
              </text>
              <text
                x={W - 2}
                y={BARH / 2 + 3.5}
                textAnchor="end"
                fontSize={9}
                fill="rgba(255,255,255,0.3)"
              >
                {(pct * 100).toFixed(1)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function CascadeHistogram({ rounds }: { rounds: RoundAnalyticsEntry[] }) {
  const total = rounds.length;
  if (total === 0) return null;

  const MAX_BUCKET = 8;
  const counts: number[] = new Array(MAX_BUCKET + 1).fill(0);
  for (const r of rounds) counts[Math.min(r.cascades, MAX_BUCKET)]++;

  const maxCount = Math.max(...counts, 1);
  const W = 520;
  const H = 110;
  const PAD = { t: 10, r: 16, b: 22, l: 16 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;
  const slotW = iW / counts.length;
  const barW = Math.max(Math.floor(slotW * 0.68), 4);

  return (
    <div
      style={{
        background: CHART_BG,
        borderRadius: 8,
        padding: "8px 4px 4px"
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        {counts.map((count, i) => {
          const barH =
            count > 0 ? Math.max(2, (count / maxCount) * iH) : 1;
          const x = PAD.l + i * slotW + (slotW - barW) / 2;
          const y = PAD.t + iH - barH;
          const color =
            i === 0 ? "#443344" : i <= 2 ? "#7a5e1a" : "#c6933c";

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                fill={color}
                rx={2}
                fillOpacity={0.85}
              />
              <text
                x={x + barW / 2}
                y={H - 5}
                textAnchor="middle"
                fontSize={9}
                fill="rgba(255,255,255,0.3)"
              >
                {i === MAX_BUCKET ? `${i}+` : i}
              </text>
              {count > 0 && barH >= 14 ? (
                <text
                  x={x + barW / 2}
                  y={y + 9.5}
                  textAnchor="middle"
                  fontSize={7.5}
                  fill="rgba(255,255,255,0.5)"
                >
                  {((count / total) * 100).toFixed(0)}%
                </text>
              ) : null}
            </g>
          );
        })}
        <text
          x={W / 2}
          y={H - 0}
          textAnchor="middle"
          fontSize={8.5}
          fill="rgba(255,255,255,0.2)"
        >
          cascades per spin
        </text>
      </svg>
    </div>
  );
}

function BalanceChart({ rounds }: { rounds: RoundAnalyticsEntry[] }) {
  const id = useId();
  const gradId = `bal-grad-${id}`;

  if (rounds.length < 2) return null;

  const display = rounds.slice(-500);
  const balances = display.map((r) => r.balanceAfter);
  const n = balances.length;
  const yMin = Math.min(...balances);
  const yMax = Math.max(...balances);
  const yRange = yMax - yMin || 1;

  const W = 580;
  const H = 100;
  const PAD = { t: 10, r: 24, b: 18, l: 60 };
  const iW = W - PAD.l - PAD.r;
  const iH = H - PAD.t - PAD.b;

  const xP = (i: number) => PAD.l + (i / Math.max(n - 1, 1)) * iW;
  const yP = (v: number) => PAD.t + (1 - (v - yMin) / yRange) * iH;

  const pts = balances.map((v, i) => `${xP(i).toFixed(1)},${yP(v).toFixed(1)}`).join(" ");
  const areaPts = `${xP(0).toFixed(1)},${(PAD.t + iH).toFixed(1)} ${pts} ${xP(n - 1).toFixed(1)},${(PAD.t + iH).toFixed(1)}`;

  const last = balances[n - 1] ?? 0;
  const first = balances[0] ?? 0;
  const trend = last >= first;
  const lineColor = trend ? "#c6933c" : "#e05858";

  return (
    <div
      style={{
        background: CHART_BG,
        borderRadius: 8,
        padding: "8px 4px 4px"
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.22} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0.01} />
          </linearGradient>
        </defs>

        <line
          x1={PAD.l}
          x2={W - PAD.r}
          y1={PAD.t + iH}
          y2={PAD.t + iH}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={0.5}
        />

        <polygon points={areaPts} fill={`url(#${gradId})`} />
        <polyline
          points={pts}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <text
          x={PAD.l - 4}
          y={PAD.t + 4}
          textAnchor="end"
          fontSize={8.5}
          fill="rgba(255,255,255,0.28)"
        >
          €{yMax.toFixed(0)}
        </text>
        <text
          x={PAD.l - 4}
          y={PAD.t + iH + 4}
          textAnchor="end"
          fontSize={8.5}
          fill="rgba(255,255,255,0.28)"
        >
          €{yMin.toFixed(0)}
        </text>
        <text
          x={W - PAD.r + 4}
          y={yP(last) + 4}
          fontSize={9.5}
          fontWeight="bold"
          fill={lineColor}
        >
          €{last.toFixed(0)}
        </text>
      </svg>
    </div>
  );
}

function exportToCsv(rounds: RoundAnalyticsEntry[]) {
  if (rounds.length === 0) return;

  const header =
    "id,timestamp,date,bet,win,net,mode,cascades,bonusTriggered,multiplier,winMultiple,tier,balanceAfter";
  const rows = rounds.map((r) =>
    [
      r.id,
      r.timestamp,
      new Date(r.timestamp).toISOString(),
      fmt2(r.bet),
      fmt2(r.win),
      fmt2(r.net),
      r.mode,
      r.cascades,
      r.bonusTriggered,
      r.multiplier,
      r.winMultiple.toFixed(4),
      r.tier,
      fmt2(r.balanceAfter)
    ].join(",")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `eitsky-rounds-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type Props = {
  rounds: RoundAnalyticsEntry[];
};

export function SessionAnalyticsOverlay({ rounds }: Props) {
  const [spinWindow, setSpinWindow] = useState<"all" | 1000 | 10000 | 50000 | 100000>("all");
  const [timeWindow, setTimeWindow] = useState<"all" | "24h" | "7d" | "30d" | "90d">("all");

  const filteredRounds = useMemo(() => {
    let next = rounds;

    if (timeWindow !== "all") {
      const now = Date.now();
      const msByWindow: Record<"24h" | "7d" | "30d" | "90d", number> = {
        "24h": 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
        "90d": 90 * 24 * 60 * 60 * 1000
      };
      const threshold = now - msByWindow[timeWindow];
      next = next.filter((entry) => entry.timestamp >= threshold);
    }

    if (spinWindow !== "all") {
      next = next.slice(-spinWindow);
    }

    return next;
  }, [rounds, spinWindow, timeWindow]);

  const stats = useMemo(() => computeStats(filteredRounds), [filteredRounds]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {rounds.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "rgba(255,255,255,0.3)"
          }}
        >
          <p style={{ margin: 0, fontSize: 16, fontFamily: "var(--font-display, Cinzel, serif)" }}>
            No rounds recorded yet.
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 12 }}>
            Play some rounds to see analytics here.
          </p>
        </div>
      ) : (
        <>
          <div>
            <p className="eyebrow">Data Window</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Spins</span>
                <select
                  className="controlSelect"
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "all") {
                      setSpinWindow("all");
                      return;
                    }
                    setSpinWindow(Number(value) as 1000 | 10000 | 50000 | 100000);
                  }}
                  value={spinWindow}
                >
                  <option value="all">All</option>
                  <option value="1000">Last 1,000</option>
                  <option value="10000">Last 10,000</option>
                  <option value="50000">Last 50,000</option>
                  <option value="100000">Last 100,000</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Time</span>
                <select
                  className="controlSelect"
                  onChange={(event) => {
                    setTimeWindow(event.target.value as "all" | "24h" | "7d" | "30d" | "90d");
                  }}
                  value={timeWindow}
                >
                  <option value="all">All time</option>
                  <option value="24h">Last 24h</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
              </label>
            </div>
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              Showing {fmtNum(filteredRounds.length)} / {fmtNum(rounds.length)} tracked rounds.
            </p>
          </div>

          {/* Summary Cards */}
          {stats ? (
            <div>
              <p className="eyebrow">Session Summary</p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                  gap: 8,
                  marginTop: 8
                }}
              >
                <SummaryCard
                  label="Total Spins"
                  value={fmtNum(stats.totalSpins)}
                  sub={`${fmtNum(stats.baseSpins)} base / ${fmtNum(stats.bonusSpins)} bonus`}
                />
                <SummaryCard
                  label="Wagered"
                  value={fmtEur(stats.totalWagered)}
                  sub={`avg ${fmtEur(stats.avgBet)}/spin`}
                />
                <SummaryCard
                  label="Returned"
                  value={fmtEur(stats.totalReturned)}
                />
                <SummaryCard
                  label="Net P/L"
                  value={`${stats.totalNet >= 0 ? "+" : ""}${fmtEur(stats.totalNet)}`}
                  accent={stats.totalNet >= 0}
                  danger={stats.totalNet < 0}
                />
                <SummaryCard
                  label="Observed RTP"
                  value={fmtPct(stats.observedRtp)}
                  sub="target: 95.5%"
                  accent={stats.observedRtp >= 0.945}
                  danger={stats.observedRtp > 0 && stats.observedRtp < 0.9}
                />
                <SummaryCard
                  label="Hit Rate"
                  value={fmtPct(stats.hitRate)}
                  sub={`${fmtNum(stats.hitCount)} winning spins`}
                />
                <SummaryCard
                  label="Bonus Triggers"
                  value={fmtNum(stats.bonusTriggers)}
                  sub={
                    stats.bonusTriggers > 0
                      ? `1:${Math.round(stats.totalSpins / stats.bonusTriggers)}`
                      : "none yet"
                  }
                />
                <SummaryCard
                  label="Peak Win"
                  value={fmtEur(stats.peakWin)}
                  sub={`x${stats.peakMultiple.toFixed(2)}`}
                  accent={stats.peakMultiple >= 5}
                />
                <SummaryCard
                  label="Avg Cascades"
                  value={stats.avgCascades.toFixed(2)}
                  sub="per spin"
                />
              </div>
            </div>
          ) : null}

          {/* RTP Trend */}
          <div>
            <p className="eyebrow">Running RTP</p>
            <p
              style={{
                margin: "2px 0 8px",
                fontSize: 10,
                color: "rgba(255,255,255,0.3)"
              }}
            >
              Cumulative RTP over the selected window (chart draws up to last 500 points). Dashed = 95.5% target.
            </p>
            <RtpLineChart rounds={filteredRounds} />
          </div>

          {/* Win Tier Distribution */}
          <div>
            <p className="eyebrow">Win Tier Distribution</p>
            <p
              style={{
                margin: "2px 0 8px",
                fontSize: 10,
                color: "rgba(255,255,255,0.3)"
              }}
            >
              BIG WIN: x5–x8 · HUGE WIN: x8–x14.9 · SUPER WIN: x14.9+
            </p>
            <WinTierChart rounds={filteredRounds} />
          </div>

          {/* Cascade Distribution */}
          <div>
            <p className="eyebrow">Cascade Distribution</p>
            <p
              style={{
                margin: "2px 0 8px",
                fontSize: 10,
                color: "rgba(255,255,255,0.3)"
              }}
            >
              How many cascade steps per spin (0 = no win).
            </p>
            <CascadeHistogram rounds={filteredRounds} />
          </div>

          {/* Balance History */}
          <div>
            <p className="eyebrow">Balance History</p>
            <p
              style={{
                margin: "2px 0 8px",
                fontSize: 10,
                color: "rgba(255,255,255,0.3)"
              }}
            >
              Selected window (chart draws up to last 500 points). Balance after each spin.
            </p>
            <BalanceChart rounds={filteredRounds} />
          </div>

          {/* CSV Export */}
          <div>
            <p className="eyebrow">Export Data</p>
            <p
              style={{
                margin: "2px 0 12px",
                fontSize: 12,
                color: "rgba(255,255,255,0.4)",
                lineHeight: 1.5
              }}
            >
              Download selected {fmtNum(filteredRounds.length)} rounds as CSV. Open in Excel
              for custom filtering, pivot tables, and distribution analysis.
            </p>
            <button
              className="welcomeButton compactPrimary"
              onClick={() => exportToCsv(filteredRounds)}
              type="button"
            >
              Download CSV ({fmtNum(filteredRounds.length)} rounds)
            </button>
          </div>
        </>
      )}
    </div>
  );
}
