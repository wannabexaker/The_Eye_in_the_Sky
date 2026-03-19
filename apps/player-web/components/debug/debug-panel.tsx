import type { SpinResult } from "@eye/game-engine";

type DebugPanelProps = {
  visible: boolean;
  result: SpinResult | null;
  boardRules: string[];
};

export function DebugPanel({ visible, result, boardRules }: DebugPanelProps) {
  if (!visible) {
    return null;
  }

  const debugItems = result
    ? [
        "Seed: local-runtime",
        `Mode: ${result.mode}`,
        `Cascade ladder: ${result.cascades.map((step) => `#${step.index} x${step.cascadeMultiplier}`).join(", ") || "none"}`,
        `Engine results: ${result.cascades.length} cascade steps`,
        "Symbol weights: default profile active"
      ]
    : ["No round data yet.", ...boardRules];

  return (
    <section className="panelCard compactModalPanel">
      <div className="panelHeader">
        <p className="eyebrow">Debug</p>
      </div>
      <ul className="statsList">
        {debugItems.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
