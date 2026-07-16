/*
Purpose: production dependency audit against npm's bulk advisory endpoint.
Why: npm retired the classic audit endpoints (HTTP 410) in July 2026 and pnpm
(≤10.34 / 11.13) still calls them, so `pnpm audit` is dead in CI. This script
does what `pnpm audit --prod --audit-level high` did, via the supported API:
https://api-docs.npmjs.com/#tag/Audit (advisories/bulk).

Usage: node scripts/audit-bulk.mjs
Exit codes: 0 = no high/critical advisories, 1 = high/critical found (or the
inventory/endpoint failed — fail closed).
*/

import { execSync } from "node:child_process";

const BULK_ENDPOINT = "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk";
const FAIL_SEVERITIES = new Set(["high", "critical"]);

const collectProdPackages = () => {
  // Flat inventory of every installed production package: {license: [{name, versions}]}
  const raw = execSync("corepack pnpm licenses list --prod --json", {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "inherit"]
  });
  const byLicense = JSON.parse(raw);

  const packages = new Map();
  for (const entries of Object.values(byLicense)) {
    for (const entry of entries) {
      const versions = packages.get(entry.name) ?? new Set();
      for (const version of entry.versions) {
        versions.add(version);
      }
      packages.set(entry.name, versions);
    }
  }
  return packages;
};

const main = async () => {
  const packages = collectProdPackages();
  if (packages.size === 0) {
    console.error("audit-bulk: package inventory came back empty — failing closed.");
    process.exit(1);
  }

  const body = Object.fromEntries(
    [...packages.entries()].map(([name, versions]) => [name, [...versions]])
  );

  const response = await fetch(BULK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    console.error(`audit-bulk: bulk endpoint responded ${response.status} — failing closed.`);
    process.exit(1);
  }

  // Response shape: { "<package>": [ { id, url, title, severity, vulnerable_versions } ] }
  const advisories = await response.json();
  const counts = { critical: 0, high: 0, moderate: 0, low: 0, info: 0 };
  const failures = [];

  for (const [name, list] of Object.entries(advisories)) {
    for (const advisory of list) {
      const severity = String(advisory.severity ?? "info").toLowerCase();
      counts[severity] = (counts[severity] ?? 0) + 1;
      if (FAIL_SEVERITIES.has(severity)) {
        failures.push(
          `  ${severity.toUpperCase()}  ${name} (${advisory.vulnerable_versions}) — ${advisory.title}\n` +
            `          ${advisory.url}`
        );
      }
    }
  }

  console.log(
    `audit-bulk: scanned ${packages.size} production packages — ` +
      `${counts.critical} critical, ${counts.high} high, ${counts.moderate} moderate, ${counts.low} low`
  );

  if (failures.length > 0) {
    console.error("\nHigh/critical advisories:\n" + failures.join("\n"));
    process.exit(1);
  }
};

main().catch((error) => {
  console.error(`audit-bulk: ${error instanceof Error ? error.message : error} — failing closed.`);
  process.exit(1);
});
