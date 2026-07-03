/**
 * FairnessService — Unit Tests
 *
 * Verifies the commit-reveal lifecycle against an in-memory Prisma mock:
 * lazy seed creation, commitment shape (never leaks the active serverSeed),
 * client-seed updates, rotation reveal semantics, and nonce advancement in
 * consumeSpinSeed matching the deriveProvablyFairSeed contract.
 */

import { FairnessService } from "./fairness.service";
import { deriveProvablyFairSeed, hashServerSeed } from "./provably-fair";
import type { PrismaService } from "./prisma.service";

type SeedRow = {
  userId: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  previousServerSeed: string | null;
  previousServerSeedHash: string | null;
};

const USER_ID = "cuser0000000000000000000001";

/** Minimal in-memory stand-in for prisma.playerFairnessSeed. */
const createSeedStore = (initial?: Partial<SeedRow>) => {
  const rows = new Map<string, SeedRow>();
  if (initial) {
    rows.set(initial.userId ?? USER_ID, {
      userId: USER_ID,
      serverSeed: "s".repeat(64),
      serverSeedHash: hashServerSeed("s".repeat(64)),
      clientSeed: "client-seed",
      nonce: 0,
      previousServerSeed: null,
      previousServerSeedHash: null,
      ...initial
    });
  }

  const playerFairnessSeed = {
    findUnique: jest.fn(async ({ where }: { where: { userId: string } }) =>
      rows.get(where.userId) ?? null
    ),
    create: jest.fn(async ({ data }: { data: Omit<SeedRow, "nonce" | "previousServerSeed" | "previousServerSeedHash"> }) => {
      const row: SeedRow = {
        nonce: 0,
        previousServerSeed: null,
        previousServerSeedHash: null,
        ...data
      };
      rows.set(row.userId, row);
      return row;
    }),
    update: jest.fn(
      async ({ where, data }: { where: { userId: string }; data: Partial<SeedRow> }) => {
        const existing = rows.get(where.userId);
        if (!existing) {
          throw new Error("record not found");
        }
        const next = { ...existing, ...data };
        rows.set(where.userId, next);
        return next;
      }
    )
  };

  return { rows, playerFairnessSeed };
};

const buildService = (store: ReturnType<typeof createSeedStore>) =>
  new FairnessService({ playerFairnessSeed: store.playerFairnessSeed } as unknown as PrismaService);

describe("FairnessService", () => {
  describe("getCommitment", () => {
    it("lazily creates a seed with a valid sha256 commitment", async () => {
      const store = createSeedStore();
      const service = buildService(store);

      const commitment = await service.getCommitment(USER_ID);

      expect(store.playerFairnessSeed.create).toHaveBeenCalledTimes(1);
      const row = store.rows.get(USER_ID)!;
      expect(row.serverSeed).toMatch(/^[0-9a-f]{64}$/);
      expect(commitment.serverSeedHash).toBe(hashServerSeed(row.serverSeed));
      expect(commitment.nonce).toBe(0);
      expect(commitment.previousServerSeed).toBeNull();
    });

    it("never exposes the active serverSeed", async () => {
      const store = createSeedStore({});
      const service = buildService(store);

      const commitment = await service.getCommitment(USER_ID);

      expect(Object.keys(commitment).sort()).toEqual([
        "clientSeed",
        "nonce",
        "previousServerSeed",
        "previousServerSeedHash",
        "serverSeedHash"
      ]);
      expect(JSON.stringify(commitment)).not.toContain(store.rows.get(USER_ID)!.serverSeed);
    });

    it("reuses the existing seed when present", async () => {
      const store = createSeedStore({ clientSeed: "existing" });
      const service = buildService(store);

      const commitment = await service.getCommitment(USER_ID);

      expect(store.playerFairnessSeed.create).not.toHaveBeenCalled();
      expect(commitment.clientSeed).toBe("existing");
    });
  });

  describe("setClientSeed", () => {
    it("trims and persists the player-chosen seed", async () => {
      const store = createSeedStore({});
      const service = buildService(store);

      const commitment = await service.setClientSeed(USER_ID, "  lucky-777  ");

      expect(commitment.clientSeed).toBe("lucky-777");
      expect(store.rows.get(USER_ID)!.clientSeed).toBe("lucky-777");
    });
  });

  describe("rotateServerSeed", () => {
    it("reveals the outgoing seed, issues a fresh commitment, resets nonce", async () => {
      const store = createSeedStore({ nonce: 17 });
      const service = buildService(store);
      const before = { ...store.rows.get(USER_ID)! };

      const rotation = await service.rotateServerSeed(USER_ID);

      // the revealed seed is exactly the one that was committed before
      expect(rotation.revealedServerSeed).toBe(before.serverSeed);
      expect(rotation.previousServerSeed).toBe(before.serverSeed);
      expect(rotation.previousServerSeedHash).toBe(before.serverSeedHash);
      // reveal is honest: hash(previous) must equal the prior public commitment
      expect(hashServerSeed(rotation.revealedServerSeed)).toBe(before.serverSeedHash);

      const after = store.rows.get(USER_ID)!;
      expect(after.serverSeed).not.toBe(before.serverSeed);
      expect(rotation.serverSeedHash).toBe(hashServerSeed(after.serverSeed));
      expect(rotation.nonce).toBe(0);
    });
  });

  describe("consumeSpinSeed", () => {
    it("derives the engine seed from the current nonce, then advances it", async () => {
      const store = createSeedStore({ nonce: 5, clientSeed: "cs-1" });
      const service = buildService(store);
      const row = store.rows.get(USER_ID)!;
      const tx = { playerFairnessSeed: store.playerFairnessSeed };

      const consumed = await service.consumeSpinSeed(tx as never, USER_ID);

      expect(consumed.nonce).toBe(5);
      expect(consumed.seed).toBe(deriveProvablyFairSeed(row.serverSeed, "cs-1", 5));
      expect(consumed.clientSeed).toBe("cs-1");
      expect(consumed.serverSeedHash).toBe(row.serverSeedHash);
      expect(store.rows.get(USER_ID)!.nonce).toBe(6);
    });

    it("consecutive spins consume strictly increasing nonces with distinct seeds", async () => {
      const store = createSeedStore({});
      const service = buildService(store);
      const tx = { playerFairnessSeed: store.playerFairnessSeed };

      const first = await service.consumeSpinSeed(tx as never, USER_ID);
      const second = await service.consumeSpinSeed(tx as never, USER_ID);
      const third = await service.consumeSpinSeed(tx as never, USER_ID);

      expect([first.nonce, second.nonce, third.nonce]).toEqual([0, 1, 2]);
      expect(new Set([first.seed, second.seed, third.seed]).size).toBe(3);
    });
  });
});
