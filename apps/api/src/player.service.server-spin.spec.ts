/**
 * PlayerService.resolveServerRound — Integration Tests (real engine, no DB)
 *
 * Runs the server-authoritative spin path with the REAL game engine and the
 * REAL FairnessService against an in-memory Prisma transaction mock. Proves:
 * - flag OFF → 404 PROVABLY_FAIR_DISABLED before any state is touched
 * - the persisted round carries the commit-reveal fields (clientSeed,
 *   serverSeedHash, nonce) and the exact derived seed
 * - the outcome is reproducible: an independent resolveSpin with the same
 *   derived seed yields the identical board and win (verifier contract)
 * - wallet math: finalBalance = balance − chargedBet + totalWin
 * - INSUFFICIENT_BALANCE rejects before any wallet write
 */

import { BadRequestException, NotFoundException } from "@nestjs/common";
import { getGameConfigProfile, initialGameState, resolveSpin } from "@eye/game-engine";
import { FairnessService } from "./fairness.service";
import { PlayerService } from "./player.service";
import { ResponsibleGamingService } from "./responsible-gaming.service";
import { deriveProvablyFairSeed, hashServerSeed } from "./provably-fair";
import type { GameConfigService } from "./game-config.service";
import type { PrismaService } from "./prisma.service";
import type { CurrentAuthUser } from "./auth.types";

const USER: CurrentAuthUser = {
  id: "cuser0000000000000000000001",
  email: "player@example.com",
  role: "player",
  sessionId: "csession00000000000000000001"
} as CurrentAuthUser;

const SERVER_SEED = "f".repeat(63) + "a";
const CLIENT_SEED = "verify-me-123";
const PROFILE = getGameConfigProfile("math_base_v2_0");

const originalFlag = process.env.PROVABLY_FAIR_ENABLED;

afterEach(() => {
  if (originalFlag === undefined) delete process.env.PROVABLY_FAIR_ENABLED;
  else process.env.PROVABLY_FAIR_ENABLED = originalFlag;
});

/** In-memory Prisma stand-in covering exactly the tables the spin path touches. */
const buildDbMock = (balance: number, startNonce = 0) => {
  const state = {
    seedRow: {
      userId: USER.id,
      serverSeed: SERVER_SEED,
      serverSeedHash: hashServerSeed(SERVER_SEED),
      clientSeed: CLIENT_SEED,
      nonce: startNonce,
      previousServerSeed: null as string | null,
      previousServerSeedHash: null as string | null
    },
    wallet: { id: "wallet-1", userId: USER.id, balance },
    rounds: [] as Array<Record<string, unknown>>,
    ledger: [] as Array<Record<string, unknown>>,
    walletUpdates: [] as Array<{ balance: number }>
  };

  const tx = {
    playerFairnessSeed: {
      findUnique: jest.fn(async () => state.seedRow),
      create: jest.fn(),
      update: jest.fn(async ({ data }: { data: { nonce: number } }) => {
        state.seedRow = { ...state.seedRow, ...data };
        return state.seedRow;
      })
    },
    wallet: {
      findUnique: jest.fn(async () => state.wallet),
      update: jest.fn(async ({ data }: { data: { balance: number } }) => {
        state.walletUpdates.push({ balance: data.balance });
        state.wallet = { ...state.wallet, balance: data.balance };
        return state.wallet;
      })
    },
    gameSession: {
      findUnique: jest.fn(async () => null),
      create: jest.fn(async ({ data }: { data: unknown }) => ({ id: "gs-1", ...(data as object) })),
      update: jest.fn()
    },
    round: {
      findUnique: jest.fn(async () => null),
      upsert: jest.fn(async ({ create }: { create: Record<string, unknown> }) => {
        state.rounds.push(create);
        return create;
      })
    },
    ledgerEntry: {
      deleteMany: jest.fn(async () => ({ count: 0 })),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.ledger.push(data);
        return data;
      })
    },
    bonusState: { create: jest.fn(async () => ({})) },
    playerResponsibleGaming: { findUnique: jest.fn(async () => null) }
  };

  const prisma = {
    $transaction: jest.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    game: { findUnique: jest.fn(async () => ({ id: "game-1", key: "eye-in-the-sky" })) }
  };

  return { state, tx, prisma };
};

const buildService = (db: ReturnType<typeof buildDbMock>) => {
  const prisma = db.prisma as unknown as PrismaService;
  const fairness = new FairnessService(prisma);
  const rg = new ResponsibleGamingService(prisma);
  const gameConfig = {
    getActiveConfig: jest.fn(async () => ({
      activeProfileId: PROFILE.id,
      activeProfileLabel: PROFILE.label,
      isLegacy: PROFILE.isLegacy,
      activeConfig: PROFILE.config
    }))
  } as unknown as GameConfigService;

  const service = new PlayerService(prisma, rg, fairness, gameConfig);
  const snapshot = { balance: 0 };
  jest
    .spyOn(service as unknown as { buildPlayerSnapshot: () => Promise<unknown> }, "buildPlayerSnapshot")
    .mockResolvedValue(snapshot);
  return { service, snapshot };
};

describe("PlayerService.resolveServerRound", () => {
  it("404s with PROVABLY_FAIR_DISABLED while the flag is off — nothing touched", async () => {
    delete process.env.PROVABLY_FAIR_ENABLED;
    const db = buildDbMock(1000);
    const { service } = buildService(db);

    try {
      await service.resolveServerRound(USER, { bet: 1 });
      throw new Error("expected NotFoundException");
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundException);
      expect((error as NotFoundException).getResponse()).toMatchObject({
        code: "PROVABLY_FAIR_DISABLED"
      });
    }
    expect(db.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects non-positive bets with 400", async () => {
    process.env.PROVABLY_FAIR_ENABLED = "true";
    const db = buildDbMock(1000);
    const { service } = buildService(db);

    await expect(service.resolveServerRound(USER, { bet: 0 })).rejects.toBeInstanceOf(
      BadRequestException
    );
    await expect(service.resolveServerRound(USER, { bet: -3 })).rejects.toBeInstanceOf(
      BadRequestException
    );
    expect(db.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("persists the round with the exact commit-reveal fields and derived seed", async () => {
    process.env.PROVABLY_FAIR_ENABLED = "true";
    const db = buildDbMock(1000, 4);
    const { service } = buildService(db);

    const { result } = await service.resolveServerRound(USER, { bet: 2 });

    expect(db.state.rounds).toHaveLength(1);
    const persisted = db.state.rounds[0];
    const expectedSeed = deriveProvablyFairSeed(SERVER_SEED, CLIENT_SEED, 4);

    expect(persisted.clientSeed).toBe(CLIENT_SEED);
    expect(persisted.serverSeedHash).toBe(hashServerSeed(SERVER_SEED));
    expect(persisted.nonce).toBe(4);
    expect(persisted.seedUsed).toBe(String(expectedSeed));
    expect(result.seedUsed).toBe(expectedSeed);
    // nonce advanced for the next spin
    expect(db.state.seedRow.nonce).toBe(5);
  });

  it("outcome is reproducible from the revealed inputs (verifier contract)", async () => {
    process.env.PROVABLY_FAIR_ENABLED = "true";
    const db = buildDbMock(1000);
    const { service } = buildService(db);

    const { result } = await service.resolveServerRound(USER, { bet: 2 });

    // independent reproduction: same derivation, fresh state, same config
    const seed = deriveProvablyFairSeed(SERVER_SEED, CLIENT_SEED, 0);
    const reproduced = resolveSpin(
      { bet: 2, state: initialGameState(1000), seed },
      PROFILE.config
    );

    expect(reproduced.seedUsed).toBe(result.seedUsed);
    expect(reproduced.totalWin).toBe(result.totalWin);
    expect(reproduced.walletDelta).toBe(result.walletDelta);
    expect(reproduced.initialBoard).toEqual(result.initialBoard);
  });

  it("applies wallet math: finalBalance = balance − chargedBet + totalWin", async () => {
    process.env.PROVABLY_FAIR_ENABLED = "true";
    const db = buildDbMock(500);
    const { service } = buildService(db);

    const { result } = await service.resolveServerRound(USER, { bet: 5 });

    const chargedBet = Number(result.debugMetadata?.chargedBet ?? 0);
    const expectedFinal = Number((500 - chargedBet + Number(result.totalWin)).toFixed(2));
    expect(db.state.walletUpdates).toHaveLength(1);
    expect(db.state.walletUpdates[0].balance).toBe(expectedFinal);

    // ledger: a bet entry always exists for a charged base spin
    const betEntry = db.state.ledger.find((entry) => entry.reason === "round_bet");
    expect(betEntry).toBeDefined();
    expect(betEntry!.amount).toBe(-chargedBet);
  });

  it("rejects INSUFFICIENT_BALANCE without touching the wallet", async () => {
    process.env.PROVABLY_FAIR_ENABLED = "true";
    const db = buildDbMock(0.5);
    const { service } = buildService(db);

    try {
      await service.resolveServerRound(USER, { bet: 10 });
      throw new Error("expected BadRequestException");
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toMatchObject({
        code: "INSUFFICIENT_BALANCE"
      });
    }
    expect(db.state.walletUpdates).toHaveLength(0);
    expect(db.state.rounds).toHaveLength(0);
  });

  it("two players with different client seeds get different outcomes for the same nonce", async () => {
    process.env.PROVABLY_FAIR_ENABLED = "true";
    const seedA = deriveProvablyFairSeed(SERVER_SEED, "alice-seed", 0);
    const seedB = deriveProvablyFairSeed(SERVER_SEED, "bob-seed", 0);
    expect(seedA).not.toBe(seedB);

    const spinA = resolveSpin({ bet: 1, state: initialGameState(100), seed: seedA }, PROFILE.config);
    const spinB = resolveSpin({ bet: 1, state: initialGameState(100), seed: seedB }, PROFILE.config);
    // identical seeds would produce identical boards; distinct seeds must not
    expect(spinA.initialBoard).not.toEqual(spinB.initialBoard);
  });
});
