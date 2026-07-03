/*
Purpose: CLI wrapper for the PAR report generator — the only module that
touches node: APIs, kept out of the package barrel so the browser bundle
(player-web transpiles this package) never sees node:fs / node:path.

Usage (writes docs/par/PAR_<profile>.md + .json):
  corepack pnpm --filter @eye/game-engine par-report -- --spins 200000 --seed 1337 [--profile <id>]
*/

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { listGameConfigProfiles, type GameMathProfileId } from "./config";
import { buildParReport, renderParReportMarkdown } from "./par-report";

const parseNumberArg = (flag: string, fallback: number): number => {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return fallback;
  }
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) ? value : fallback;
};

const runParReportCli = async () => {
  const spins = parseNumberArg("--spins", 200_000);
  const seed = parseNumberArg("--seed", 1337);
  const profileArgIndex = process.argv.indexOf("--profile");
  const onlyProfile =
    profileArgIndex === -1 ? null : (process.argv[profileArgIndex + 1] as GameMathProfileId);

  const outDir = join(process.cwd(), "..", "..", "docs", "par");
  await mkdir(outDir, { recursive: true });

  const profiles = listGameConfigProfiles()
    .map((profile) => profile.id)
    .filter((id) => !onlyProfile || id === onlyProfile);

  for (const profileId of profiles) {
    const report = buildParReport(profileId, spins, seed);
    const markdown = renderParReportMarkdown(report);
    await writeFile(join(outDir, `PAR_${profileId}.md`), markdown, "utf8");
    await writeFile(
      join(outDir, `PAR_${profileId}.json`),
      JSON.stringify(report, null, 2),
      "utf8"
    );
    console.log(
      `PAR_${profileId}: RTP ${(report.simulated.achievedRtp * 100).toFixed(4)}% ` +
        `hit ${(report.simulated.hitRate * 100).toFixed(2)}% ` +
        `bonus 1:${report.simulated.bonusTriggerRate > 0 ? (1 / report.simulated.bonusTriggerRate).toFixed(0) : "—"}`
    );
  }
};

void runParReportCli();
