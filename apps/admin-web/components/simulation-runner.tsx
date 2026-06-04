"use client";

import { useEffect, useMemo, useState } from "react";

type ProfileId = "legacy_v1_3" | "math_base_v2_0" | "constellation_simple_v0_1";
type JobStatus = "queued" | "running" | "completed" | "failed";

type SimulationJob = {
  jobId: string;
  status: JobStatus;
  progress: number;
  error?: string;
  request: {
    profileId: ProfileId;
    spins: number;
    bet: number;
    seed: number;
    winMultiplier?: number;
  };
  result?: {
    profileId: ProfileId;
    configVersion: string;
    spins: number;
    bet: number;
    seed: number;
    winMultiplier: number;
    rtp: number;
    hitRate: number;
    bonusRate: number;
    volatilityIndex: number;
    p95Win: number;
    p99Win: number;
    maxWin: number;
    averageWin: number;
    averageWinOnHit: number;
    confidenceLow: number;
    confidenceHigh: number;
  };
};

const PROFILE_OPTIONS: Array<{ id: ProfileId; label: string }> = [
  { id: "math_base_v2_0", label: "Math Base v2.0" },
  { id: "legacy_v1_3", label: "Legacy Math v1.3" },
  { id: "constellation_simple_v0_1", label: "Constellation Simple v0.1" }
];

const pct = (value: number) => `${(value * 100).toFixed(2)}%`;
const eur = (value: number) => `EUR ${value.toFixed(2)}`;

const fieldStyle = {
  display: "grid",
  gap: 6,
  color: "#c6933c",
  fontSize: 12
} as const;

const inputStyle = {
  minHeight: 38,
  border: "1px solid rgba(240,202,114,0.16)",
  borderRadius: 8,
  background: "rgba(8,7,10,0.72)",
  color: "#f8edd9",
  padding: "8px 10px",
  font: "inherit"
} as const;

export function SimulationRunner() {
  const apiBase = "/_api";
  const [profileId, setProfileId] = useState<ProfileId>("math_base_v2_0");
  const [spins, setSpins] = useState(100000);
  const [bet, setBet] = useState(20);
  const [seed, setSeed] = useState(1337);
  const [job, setJob] = useState<SimulationJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isRunning = job?.status === "queued" || job?.status === "running";

  useEffect(() => {
    if (!job || !isRunning) {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`${apiBase}/admin/simulate/${job.jobId}`, {
          cache: "no-store",
          credentials: "include"
        });
        if (!response.ok) {
          throw new Error(`poll failed (${response.status})`);
        }
        setJob((await response.json()) as SimulationJob);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Simulation poll failed.");
      }
    }, 1200);

    return () => window.clearInterval(timer);
  }, [apiBase, isRunning, job]);

  const progressLabel = useMemo(() => {
    if (!job) {
      return "Idle";
    }
    if (job.status === "completed") {
      return "Completed";
    }
    if (job.status === "failed") {
      return "Failed";
    }
    return job.status === "queued" ? "Queued" : "Running";
  }, [job]);

  const runSimulation = async () => {
    try {
      setBusy(true);
      setError("");
      setJob(null);

      const response = await fetch(`${apiBase}/admin/simulate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          spins,
          bet,
          seed,
          winMultiplier: 1
        })
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? `simulation failed (${response.status})`);
      }

      setJob((await response.json()) as SimulationJob);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Simulation failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
        <label style={fieldStyle}>
          Profile
          <select
            onChange={(event) => setProfileId(event.target.value as ProfileId)}
            style={inputStyle}
            value={profileId}
          >
            {PROFILE_OPTIONS.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label}
              </option>
            ))}
          </select>
        </label>
        <label style={fieldStyle}>
          Spins
          <input
            max={1000000}
            min={1}
            onChange={(event) => setSpins(Number(event.target.value))}
            style={inputStyle}
            type="number"
            value={spins}
          />
        </label>
        <label style={fieldStyle}>
          Bet
          <input
            min={0.1}
            onChange={(event) => setBet(Number(event.target.value))}
            step={0.1}
            style={inputStyle}
            type="number"
            value={bet}
          />
        </label>
        <label style={fieldStyle}>
          Seed
          <input
            min={0}
            onChange={(event) => setSeed(Number(event.target.value))}
            style={inputStyle}
            type="number"
            value={seed}
          />
        </label>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          disabled={busy || isRunning}
          onClick={() => void runSimulation()}
          style={{
            border: "1px solid rgba(240,202,114,0.24)",
            borderRadius: 999,
            background: "linear-gradient(180deg, rgba(240,202,114,0.96), rgba(172,124,49,0.96))",
            color: "#17120f",
            cursor: busy || isRunning ? "not-allowed" : "pointer",
            fontFamily: "var(--font-display), Georgia, serif",
            minHeight: 38,
            padding: "8px 16px"
          }}
          type="button"
        >
          {busy || isRunning ? "Running..." : "Run"}
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
            <span>{progressLabel}</span>
            <span>{job ? `${job.progress}%` : "0%"}</span>
          </div>
          <div style={{ height: 8, overflow: "hidden", borderRadius: 999, background: "rgba(255,255,255,0.08)" }}>
            <div
              style={{
                height: "100%",
                width: `${job?.progress ?? 0}%`,
                background: "#c6933c",
                transition: "width 180ms ease"
              }}
            />
          </div>
        </div>
      </div>

      {error ? (
        <div style={{ color: "#e05858", fontSize: 13 }}>
          {error}
        </div>
      ) : null}

      {job?.error ? (
        <div style={{ color: "#e05858", fontSize: 13 }}>
          {job.error}
        </div>
      ) : null}

      {job?.result ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
          {[
            ["RTP", pct(job.result.rtp)],
            ["Hit rate", pct(job.result.hitRate)],
            ["Bonus rate", pct(job.result.bonusRate)],
            ["Volatility p99/bet", `x${job.result.volatilityIndex.toFixed(2)}`],
            ["CI low/high", `${pct(job.result.confidenceLow)} - ${pct(job.result.confidenceHigh)}`],
            ["p95 win", eur(job.result.p95Win)],
            ["p99 win", eur(job.result.p99Win)],
            ["Max win", eur(job.result.maxWin)]
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                border: "1px solid rgba(240,202,114,0.12)",
                borderRadius: 8,
                background: "rgba(8,7,10,0.42)",
                padding: 10
              }}
            >
              <p style={{ margin: 0, color: "#bda98d", fontSize: 11 }}>{label}</p>
              <p style={{ margin: "4px 0 0", color: "#f8edd9", fontSize: 16, fontWeight: 700 }}>{value}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
