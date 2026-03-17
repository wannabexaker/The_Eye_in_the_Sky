import type { ReactNode } from "react";

export const Surface = ({
  title,
  eyebrow,
  children
}: {
  title: string;
  eyebrow?: string;
  children: ReactNode;
}) => (
  <section
    style={{
      borderRadius: 20,
      border: "1px solid rgba(240, 202, 114, 0.14)",
      padding: 20,
      background: "rgba(20, 14, 18, 0.84)"
    }}
  >
    {eyebrow ? (
      <p style={{ margin: "0 0 6px", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase" }}>
        {eyebrow}
      </p>
    ) : null}
    <h2 style={{ margin: 0 }}>{title}</h2>
    <div style={{ marginTop: 12 }}>{children}</div>
  </section>
);
