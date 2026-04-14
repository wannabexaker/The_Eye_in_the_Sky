"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./math-profile-selector.module.css";

type BonusTriggerMode = "meter" | "scatter";
type GameVariantId = "main_cluster" | "constellation_simple";

type RuntimeConfigShape = {
  version: string;
  targetRtp: number;
  volatility: string;
  rows: number;
  cols: number;
  clusterThreshold: number;
  maxCascadeSteps: number;
  bonusMeterTarget: number;
  bonusSpinsAwarded: number;
  bonusTriggerMode: BonusTriggerMode;
  variantId: GameVariantId;
  scatterRewards: Array<{
    count: number;
    payoutMultiplier: number;
    freeSpinsAwarded: number;
  }>;
};

type GameConfigProfile = {
  id: string;
  label: string;
  version: string;
  isLegacy: boolean;
  targetRtp: number;
  volatility: string;
};

type GameConfigState = {
  activeProfileId: string;
  activeProfileLabel: string;
  isLegacy: boolean;
  activeConfig: RuntimeConfigShape;
};

type ProfilePresentation = {
  summary: string;
  winLogic: string;
  bonusModel: string;
  pills: string[];
};

const PROFILE_PRESENTATION: Record<string, ProfilePresentation> = {
  legacy_v1_3: {
    summary: "Legacy cluster build kept for baseline comparison and compatibility checks.",
    winLogic: "Adjacent cluster wins",
    bonusModel: "Meter-driven Sky Opens",
    pills: ["Legacy", "Cluster Pays", "Meter Trigger"]
  },
  math_base_v2_0: {
    summary: "Current mainline cluster profile with the standard Samsara meter and full modifier stack.",
    winLogic: "Adjacent cluster wins",
    bonusModel: "Meter-driven Sky Opens",
    pills: ["Mainline", "Cluster Pays", "Full Modifier Stack"]
  },
  constellation_simple_v0_1: {
    summary: "Simple count-anywhere variant with scatter-led bonus flow and a cleaner special-symbol contract.",
    winLogic: "Count-anywhere pays",
    bonusModel: "Scatter-led Sky Opens",
    pills: ["Constellation", "Anywhere Pays", "Scatter Trigger"]
  }
};

const FALLBACK_PROFILES: GameConfigProfile[] = [
  {
    id: "legacy_v1_3",
    label: "Legacy Math v1.3",
    version: "eye-sky-math-v1.3",
    isLegacy: true,
    targetRtp: 0.955,
    volatility: "medium"
  },
  {
    id: "math_base_v2_0",
    label: "Math Base v2.0",
    version: "eye-sky-math-v2.0",
    isLegacy: false,
    targetRtp: 0.954,
    volatility: "medium"
  },
  {
    id: "constellation_simple_v0_1",
    label: "Constellation Simple v0.1",
    version: "eye-sky-constellation-v0.1",
    isLegacy: false,
    targetRtp: 0.952,
    volatility: "high"
  }
];

const FALLBACK_STATE: GameConfigState = {
  activeProfileId: "math_base_v2_0",
  activeProfileLabel: "Math Base v2.0",
  isLegacy: false,
  activeConfig: {
    version: "eye-sky-math-v2.0",
    targetRtp: 0.954,
    volatility: "medium",
    rows: 5,
    cols: 6,
    clusterThreshold: 8,
    maxCascadeSteps: 8,
    bonusMeterTarget: 17,
    bonusSpinsAwarded: 8,
    bonusTriggerMode: "meter",
    variantId: "main_cluster",
    scatterRewards: []
  }
};

const toPct = (value: number) => `${(value * 100).toFixed(2)}%`;

const getProfilePresentation = (profileId: string): ProfilePresentation =>
  PROFILE_PRESENTATION[profileId] ?? {
    summary: "Validated runtime profile.",
    winLogic: "Profile-defined win logic",
    bonusModel: "Profile-defined bonus model",
    pills: ["Runtime Profile"]
  };

const getWinLogicLabel = (config: RuntimeConfigShape) =>
  config.variantId === "constellation_simple"
    ? `${config.clusterThreshold}+ matching symbols anywhere`
    : `${config.clusterThreshold}+ adjacent symbols`;

const getBonusModelLabel = (config: RuntimeConfigShape) =>
  config.bonusTriggerMode === "scatter"
    ? config.scatterRewards.length > 0
      ? `Scatter trigger (${config.scatterRewards.map((entry) => `${entry.count}+`).join(" / ")})`
      : "Scatter trigger"
    : `Meter trigger at ${config.bonusMeterTarget}`;

export function MathProfileSelector() {
  const [profiles, setProfiles] = useState<GameConfigProfile[]>([]);
  const [activeState, setActiveState] = useState<GameConfigState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  const apiBase = "/_api";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        setOfflineMode(false);

        const [profilesRes, stateRes] = await Promise.all([
          fetch(`${apiBase}/game-config/profiles`, { cache: "no-store", credentials: "include" }),
          fetch(`${apiBase}/game-config`, { cache: "no-store", credentials: "include" })
        ]);

        if (!profilesRes.ok || !stateRes.ok) {
          throw new Error("Failed to fetch config data");
        }

        const profilesData = (await profilesRes.json()) as GameConfigProfile[];
        const stateData = (await stateRes.json()) as GameConfigState;

        setProfiles(profilesData);
        setActiveState(stateData);
      } catch {
        setProfiles(FALLBACK_PROFILES);
        setActiveState(FALLBACK_STATE);
        setOfflineMode(true);
        setError("API unreachable. Running in local preview mode.");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [apiBase]);

  const selectProfile = async (profileId: string) => {
    if (offlineMode) {
      const profile = FALLBACK_PROFILES.find((entry) => entry.id === profileId) ?? FALLBACK_PROFILES[1];
      const activeConfig =
        profile.id === "constellation_simple_v0_1"
          ? {
              ...FALLBACK_STATE.activeConfig,
              version: profile.version,
              targetRtp: profile.targetRtp,
              volatility: profile.volatility,
              bonusTriggerMode: "scatter" as const,
              variantId: "constellation_simple" as const,
              bonusSpinsAwarded: 7,
              scatterRewards: [
                { count: 4, payoutMultiplier: 1, freeSpinsAwarded: 7 },
                { count: 5, payoutMultiplier: 2, freeSpinsAwarded: 9 },
                { count: 6, payoutMultiplier: 5, freeSpinsAwarded: 12 }
              ]
            }
          : {
              ...FALLBACK_STATE.activeConfig,
              version: profile.version,
              targetRtp: profile.targetRtp,
              volatility: profile.volatility,
              bonusMeterTarget: profile.id === "legacy_v1_3" ? 16 : 17,
              bonusSpinsAwarded: 8,
              bonusTriggerMode: "meter" as const,
              variantId: "main_cluster" as const,
              scatterRewards: []
            };

      setActiveState({
        activeProfileId: profile.id,
        activeProfileLabel: profile.label,
        isLegacy: profile.isLegacy,
        activeConfig
      });
      return;
    }

    try {
      setSelecting(true);
      setError("");

      const res = await fetch(`${apiBase}/game-config/select`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId })
      });

      if (!res.ok) {
        throw new Error("Failed to select profile");
      }

      const newState = (await res.json()) as GameConfigState;
      setActiveState(newState);
    } catch {
      setError("Profile switch failed. Falling back to local preview mode.");
      setOfflineMode(true);
      setProfiles(FALLBACK_PROFILES);
      setActiveState((current) => current ?? FALLBACK_STATE);
    } finally {
      setSelecting(false);
    }
  };

  const activeProfile = useMemo(
    () => profiles.find((profile) => profile.id === activeState?.activeProfileId) ?? null,
    [activeState?.activeProfileId, profiles]
  );

  return (
    <div className={styles.root}>
      {error ? (
        <div className={`${styles.alert} ${offlineMode ? styles.alertOffline : ""}`}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className={styles.loading}>Loading config profiles...</p>
      ) : (
        <>
          <div className={styles.profileGrid}>
            {profiles.map((profile) => {
              const presentation = getProfilePresentation(profile.id);
              const isActive = profile.id === activeState?.activeProfileId;

              return (
                <button
                  className={`${styles.profileCard} ${isActive ? styles.profileCardActive : ""} ${selecting && !isActive ? styles.profileCardPending : ""}`}
                  disabled={selecting || isActive}
                  key={profile.id}
                  onClick={() => selectProfile(profile.id)}
                  type="button"
                >
                  <div className={styles.profileHeader}>
                    <div>
                      <span className={`${styles.profileStatus} ${profile.isLegacy ? styles.profileStatusLegacy : ""}`}>
                        {profile.isLegacy ? "Legacy" : isActive ? "Active" : "Validated"}
                      </span>
                      <h3 className={styles.profileTitle}>{profile.label}</h3>
                      <p className={styles.profileVersion}>{profile.version}</p>
                    </div>
                  </div>

                  <p className={styles.profileDescription}>{presentation.summary}</p>

                  <div className={styles.profileMetaGrid}>
                    <div>
                      <p className={styles.metaLabel}>Target RTP</p>
                      <p className={styles.metaValue}>{toPct(profile.targetRtp)}</p>
                    </div>
                    <div>
                      <p className={styles.metaLabel}>Volatility</p>
                      <p className={styles.metaValue}>{profile.volatility}</p>
                    </div>
                    <div>
                      <p className={styles.metaLabel}>Win Logic</p>
                      <p className={styles.metaValue}>{presentation.winLogic}</p>
                    </div>
                    <div>
                      <p className={styles.metaLabel}>Bonus Model</p>
                      <p className={styles.metaValue}>{presentation.bonusModel}</p>
                    </div>
                  </div>

                  <div className={styles.pillRow}>
                    {presentation.pills.map((pill) => (
                      <span className={styles.pill} key={`${profile.id}-${pill}`}>
                        {pill}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {activeState ? (
            <div className={styles.activePanel}>
              <div className={styles.activeHeader}>
                <div>
                  <p className={styles.activeEyebrow}>Active Configuration</p>
                  <h3 className={styles.activeTitle}>
                    {activeState.activeProfileLabel}
                    {activeState.isLegacy ? " (Legacy)" : ""}
                  </h3>
                </div>
                <div className={styles.syncNote}>
                  {offlineMode
                    ? "Local preview mode only. This does not update the player runtime."
                    : "Player runtime picks this up on load, on refocus, and through visible-tab polling."}
                </div>
              </div>

              <div className={styles.activeStats}>
                <div className={styles.activeStat}>
                  <p className={styles.activeStatLabel}>Version</p>
                  <p className={styles.activeStatValue}>{activeState.activeConfig.version}</p>
                </div>
                <div className={styles.activeStat}>
                  <p className={styles.activeStatLabel}>Target RTP</p>
                  <p className={styles.activeStatValue}>{toPct(activeState.activeConfig.targetRtp)}</p>
                </div>
                <div className={styles.activeStat}>
                  <p className={styles.activeStatLabel}>Board</p>
                  <p className={styles.activeStatValue}>
                    {activeState.activeConfig.cols}x{activeState.activeConfig.rows} | max {activeState.activeConfig.maxCascadeSteps} settles
                  </p>
                </div>
                <div className={styles.activeStat}>
                  <p className={styles.activeStatLabel}>Win Logic</p>
                  <p className={styles.activeStatValue}>{getWinLogicLabel(activeState.activeConfig)}</p>
                </div>
                <div className={styles.activeStat}>
                  <p className={styles.activeStatLabel}>Bonus Trigger</p>
                  <p className={styles.activeStatValue}>{getBonusModelLabel(activeState.activeConfig)}</p>
                </div>
                <div className={styles.activeStat}>
                  <p className={styles.activeStatLabel}>Award Package</p>
                  <p className={styles.activeStatValue}>
                    {activeState.activeConfig.bonusTriggerMode === "scatter"
                      ? activeState.activeConfig.scatterRewards
                          .map((reward) => `${reward.count}+ -> ${reward.freeSpinsAwarded} spins`)
                          .join(" | ")
                      : `${activeState.activeConfig.bonusSpinsAwarded} free spins`}
                  </p>
                </div>
              </div>

              {activeProfile ? (
                <p className={styles.offlineHint}>
                  Operator note: {getProfilePresentation(activeProfile.id).summary}
                </p>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
