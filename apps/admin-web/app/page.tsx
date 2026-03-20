"use client";

import { MathProfileSelector } from "@/components/math-profile-selector";
import { GameStatsViewer } from "@/components/game-stats-viewer";
import { SafetyNote } from "@/components/safety-note";

const sections = [
  {
    title: "Math profile selector",
    description: "Switch between pre-validated math profiles (v1.3 legacy, v2.0 base).",
    component: MathProfileSelector,
    ready: true
  },
  {
    title: "Game analytics",
    description: "View real-time game statistics and performance metrics (read-only).",
    component: GameStatsViewer,
    ready: true
  },
  {
    title: "Symbol weights editor",
    description: "Modify symbol frequencies and rarity (Phase 2 — requires auth).",
    ready: false
  },
  {
    title: "Paytable editor",
    description: "Adjust payout values per symbol cluster (Phase 2 — requires auth).",
    ready: false
  },
  {
    title: "Audit log viewer",
    description: "Review all game changes, profile switches, and admin actions (Phase 2).",
    ready: false
  }
];

export default function AdminPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 24,
        background: "linear-gradient(180deg, #151014 0%, #09070a 100%)",
        color: "#f8edd9",
        fontFamily: "Georgia, serif"
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <p style={{ letterSpacing: "0.18em", textTransform: "uppercase", color: "#c6933c" }}>
          Internal Tools
        </p>
        <h1 style={{ marginTop: 0, fontSize: 48 }}>The Eye in the Sky Admin</h1>
        <p style={{ maxWidth: 720, color: "#bda98d" }}>
          Phase 1 admin shell for balancing, analytics, and safe profile management. Read-only by default; edit
          operations require secure authentication (Phase 2).
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 24, marginTop: 32 }}>
          {sections.map((section) => (
            <section
              key={section.title}
              style={{
                borderRadius: 20,
                border: section.ready ? "1px solid rgba(240, 202, 114, 0.24)" : "1px solid rgba(240, 202, 114, 0.08)",
                padding: 20,
                background: section.ready ? "rgba(20, 14, 18, 0.84)" : "rgba(20, 14, 18, 0.5)",
                opacity: section.ready ? 1 : 0.7
              }}
            >
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: section.ready ? "#a8d5a8" : "#c6933c"
                }}
              >
                {section.ready ? "✅ Ready" : "⏳ Phase 2"}
              </p>
              <h2 style={{ margin: 0, fontSize: 18, marginBottom: 6 }}>{section.title}</h2>
              <p style={{ margin: "0 0 16px", color: "#bda98d", fontSize: 13 }}>{section.description}</p>

              {section.component ? (
                <div style={{ marginTop: 0 }}>
                  <section.component />
                </div>
              ) : (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    background: "rgba(198, 147, 60, 0.08)",
                    color: "#d5a35f",
                    fontSize: 12
                  }}
                >
                  🔐 Coming in Phase 2. Requires authentication and audit logging.
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
