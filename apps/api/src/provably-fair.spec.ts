/**
 * Provably-Fair Primitives — Unit Tests
 *
 * Locks the commit-reveal crypto scheme with hardcoded vectors so any change
 * to the derivation (HMAC message layout, byte order, reduction) fails loudly.
 * A third-party verifier reproducing outcomes depends on these exact semantics.
 */

import { createHmac } from "node:crypto";
import {
  deriveProvablyFairSeed,
  generateClientSeed,
  generateServerSeed,
  hashServerSeed,
  isProvablyFairEnabled
} from "./provably-fair";

const SERVER_SEED = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const CLIENT_SEED = "my-client-seed_01";

describe("provably-fair primitives", () => {
  describe("deriveProvablyFairSeed", () => {
    it("matches hardcoded vectors (HMAC-SHA256 → first 4 bytes big-endian)", () => {
      expect(deriveProvablyFairSeed(SERVER_SEED, CLIENT_SEED, 0)).toBe(3974638659);
      expect(deriveProvablyFairSeed(SERVER_SEED, CLIENT_SEED, 1)).toBe(1998381155);
      expect(deriveProvablyFairSeed(SERVER_SEED, CLIENT_SEED, 42)).toBe(1881067933);
    });

    it("is deterministic for identical inputs", () => {
      const a = deriveProvablyFairSeed(SERVER_SEED, CLIENT_SEED, 7);
      const b = deriveProvablyFairSeed(SERVER_SEED, CLIENT_SEED, 7);
      expect(a).toBe(b);
    });

    it("changes when any input changes", () => {
      const base = deriveProvablyFairSeed(SERVER_SEED, CLIENT_SEED, 0);
      expect(deriveProvablyFairSeed(SERVER_SEED, CLIENT_SEED, 1)).not.toBe(base);
      expect(deriveProvablyFairSeed(SERVER_SEED, "other-seed", 0)).not.toBe(base);
      expect(
        deriveProvablyFairSeed(SERVER_SEED.replace("e3", "e4"), CLIENT_SEED, 0)
      ).not.toBe(base);
    });

    it("always returns an unsigned 32-bit integer", () => {
      for (let nonce = 0; nonce < 200; nonce += 1) {
        const seed = deriveProvablyFairSeed(SERVER_SEED, CLIENT_SEED, nonce);
        expect(Number.isInteger(seed)).toBe(true);
        expect(seed).toBeGreaterThanOrEqual(0);
        expect(seed).toBeLessThanOrEqual(0xffffffff);
      }
    });

    it("uses `${clientSeed}:${nonce}` as the HMAC message (verifier contract)", () => {
      const digest = createHmac("sha256", SERVER_SEED)
        .update(`${CLIENT_SEED}:123`)
        .digest();
      expect(deriveProvablyFairSeed(SERVER_SEED, CLIENT_SEED, 123)).toBe(
        digest.readUInt32BE(0) >>> 0
      );
    });
  });

  describe("generateServerSeed / generateClientSeed", () => {
    it("produces 32-byte (64 hex) server seeds", () => {
      expect(generateServerSeed()).toMatch(/^[0-9a-f]{64}$/);
    });

    it("produces 16-byte (32 hex) client seeds", () => {
      expect(generateClientSeed()).toMatch(/^[0-9a-f]{32}$/);
    });

    it("does not repeat across calls", () => {
      const seen = new Set(Array.from({ length: 50 }, () => generateServerSeed()));
      expect(seen.size).toBe(50);
    });
  });

  describe("hashServerSeed", () => {
    it("is sha256 hex of the seed string (public commitment)", () => {
      expect(hashServerSeed(SERVER_SEED)).toBe(
        "cd372fb85148700fa88095e3492d3f9f5beb43e555e5ff26d95f5a6adc36f8e6"
      );
    });

    it("commitment does not reveal the seed (different value)", () => {
      const seed = generateServerSeed();
      expect(hashServerSeed(seed)).not.toBe(seed);
    });
  });

  describe("isProvablyFairEnabled", () => {
    const original = process.env.PROVABLY_FAIR_ENABLED;

    afterEach(() => {
      if (original === undefined) {
        delete process.env.PROVABLY_FAIR_ENABLED;
      } else {
        process.env.PROVABLY_FAIR_ENABLED = original;
      }
    });

    it("is false when unset", () => {
      delete process.env.PROVABLY_FAIR_ENABLED;
      expect(isProvablyFairEnabled()).toBe(false);
    });

    it('is true only for the exact string "true"', () => {
      process.env.PROVABLY_FAIR_ENABLED = "true";
      expect(isProvablyFairEnabled()).toBe(true);
      process.env.PROVABLY_FAIR_ENABLED = "TRUE";
      expect(isProvablyFairEnabled()).toBe(false);
      process.env.PROVABLY_FAIR_ENABLED = "1";
      expect(isProvablyFairEnabled()).toBe(false);
    });
  });
});
