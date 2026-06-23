/*
Purpose: Cloudflare-free provably-fair primitives for server-authoritative spins.
Layer: backend (api)
Scheme: commit-reveal. The server commits to sha256(serverSeed) before play; the
deterministic per-spin RNG seed is HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}`)
reduced to a uint32 — the exact seed the game-engine LCG consumes. Revealing the
serverSeed lets anyone reproduce every outcome under that commitment.

This feature is gated by PROVABLY_FAIR_ENABLED and is a no-op when unset.
*/

import { createHash, createHmac, randomBytes } from "node:crypto";

export const isProvablyFairEnabled = (): boolean =>
  process.env.PROVABLY_FAIR_ENABLED === "true";

export const generateServerSeed = (): string => randomBytes(32).toString("hex");

export const generateClientSeed = (): string => randomBytes(16).toString("hex");

export const hashServerSeed = (serverSeed: string): string =>
  createHash("sha256").update(serverSeed).digest("hex");

/**
 * Deterministic uint32 seed for the game-engine RNG, derived from the
 * commit-reveal inputs. The engine RNG algorithm is unchanged — only the seed
 * source — so the statistical distribution (RTP/volatility) is unaffected.
 */
export const deriveProvablyFairSeed = (
  serverSeed: string,
  clientSeed: string,
  nonce: number
): number => {
  const digest = createHmac("sha256", serverSeed)
    .update(`${clientSeed}:${nonce}`)
    .digest();
  return digest.readUInt32BE(0) >>> 0;
};
