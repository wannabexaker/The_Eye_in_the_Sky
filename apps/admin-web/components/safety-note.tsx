"use client";

export function SafetyNote() {
  return (
    <div
      style={{
        background: "rgba(139, 50, 50, 0.2)",
        border: "1px solid rgba(255, 150, 100, 0.3)",
        padding: 16,
        borderRadius: 12,
        marginTop: 24
      }}
    >
      <p style={{ margin: 0, fontSize: 12, color: "#ff9966", fontWeight: "bold" }}>
        🔒 SECURITY NOTE
      </p>
      <ul style={{ margin: "12px 0 0", paddingLeft: 20, fontSize: 12, color: "#bda98d" }}>
        <li>Admin panel is read-only by design for Phase 1 (fake-money prototype).</li>
        <li>Math profiles can only be selected from pre-validated list (no arbitrary configs).</li>
        <li>No RNG seed manipulation, balance writes, or unauthorized payout modifications.</li>
        <li>All changes logged server-side for audit trail (Phase 2).</li>
        <li>Editor panels (symbol weights, paytable) require secure authentication (Phase 2).</li>
        <li>API endpoints enforce input validation and type checking.</li>
      </ul>
    </div>
  );
}
