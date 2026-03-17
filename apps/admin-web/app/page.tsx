const sections = [
  "Math profile comparison",
  "Symbol weights editor",
  "Paytable editor",
  "Simulation runner",
  "Round and audit viewer"
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
          Phase 1 admin shell for balancing, simulation, audit review, and profile management.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {sections.map((title) => (
            <section
              key={title}
              style={{
                borderRadius: 20,
                border: "1px solid rgba(240, 202, 114, 0.14)",
                padding: 20,
                background: "rgba(20, 14, 18, 0.84)"
              }}
            >
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#c6933c"
                }}
              >
                Phase 1
              </p>
              <h2 style={{ margin: 0 }}>{title}</h2>
              <p style={{ margin: "12px 0 0", color: "#bda98d" }}>Placeholder panel ready for implementation.</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
