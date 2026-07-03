/**
 * Flagged Features E2E — Provably-Fair, Server Spin, Responsible Gaming
 *
 * Verifies the commercial feature flags end-to-end at the HTTP layer:
 * - flag OFF  → stable 404 with a machine-readable code (no route leakage)
 * - flag ON   → endpoints respond and input validation rejects bad payloads
 *
 * Strategy mirrors security.e2e-spec.ts: isolated TestingModule, mocked
 * services, overridden guards — no database. Flags are process-env driven and
 * read per-request, so each block toggles process.env directly.
 */

import { type INestApplication } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test, type TestingModule } from "@nestjs/testing";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require("supertest") as typeof import("supertest");

import { DatabaseErrorFilter } from "../src/db-error.filter";
import { FairnessController } from "../src/fairness.controller";
import { FairnessService } from "../src/fairness.service";
import { PlayerController } from "../src/player.controller";
import { PlayerService } from "../src/player.service";
import { ResponsibleGamingController } from "../src/responsible-gaming.controller";
import { ResponsibleGamingService } from "../src/responsible-gaming.service";
import { SessionAuthGuard } from "../src/auth.guard";

const MOCK_AUTH_USER = {
  id: "ctest001234567890123456789",
  email: "test@example.com",
  role: "player",
  sessionId: "csession0000000000000000001"
};

const mockSessionGuard = {
  canActivate: (ctx: import("@nestjs/common").ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    req.authUser = MOCK_AUTH_USER;
    return true;
  }
};

const mockAllow = { canActivate: () => true };

const COMMITMENT = {
  serverSeedHash: "a".repeat(64),
  clientSeed: "client-seed-1",
  nonce: 3,
  previousServerSeed: null,
  previousServerSeedHash: null
};

const originalPfFlag = process.env.PROVABLY_FAIR_ENABLED;
const originalRgFlag = process.env.RG_TOOLS_ENABLED;

describe("Flagged features (e2e)", () => {
  let app: INestApplication;
  let fairnessService: {
    getCommitment: jest.Mock;
    setClientSeed: jest.Mock;
    rotateServerSeed: jest.Mock;
  };
  let playerService: { resolveServerRound: jest.Mock; persistRound: jest.Mock };

  beforeAll(async () => {
    fairnessService = {
      getCommitment: jest.fn().mockResolvedValue(COMMITMENT),
      setClientSeed: jest.fn().mockResolvedValue({ ...COMMITMENT, clientSeed: "updated" }),
      rotateServerSeed: jest
        .fn()
        .mockResolvedValue({ ...COMMITMENT, revealedServerSeed: "b".repeat(64) })
    };
    playerService = {
      resolveServerRound: jest.fn().mockResolvedValue({ result: {}, snapshot: {} }),
      persistRound: jest.fn().mockResolvedValue({ id: "round-test" })
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 10_000 }] })],
      controllers: [FairnessController, PlayerController, ResponsibleGamingController],
      providers: [
        { provide: FairnessService, useValue: fairnessService },
        {
          provide: PlayerService,
          useValue: {
            ...playerService,
            getBootstrap: jest.fn().mockResolvedValue({}),
            claimWelcomeBonus: jest.fn().mockResolvedValue({}),
            deposit: jest.fn().mockResolvedValue({}),
            withdraw: jest.fn().mockResolvedValue({})
          }
        },
        {
          provide: ResponsibleGamingService,
          useValue: {
            getSettings: jest.fn().mockResolvedValue({}),
            updateSettings: jest.fn().mockResolvedValue({}),
            setCooloff: jest.fn().mockResolvedValue({}),
            setSelfExclusion: jest.fn().mockResolvedValue({})
          }
        },
        { provide: APP_GUARD, useClass: ThrottlerGuard }
      ]
    })
      .overrideGuard(ThrottlerGuard).useValue(mockAllow)
      .overrideGuard(SessionAuthGuard).useValue(mockSessionGuard)
      .compile();

    app = module.createNestApplication();
    app.useGlobalFilters(new DatabaseErrorFilter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  afterEach(() => {
    if (originalPfFlag === undefined) delete process.env.PROVABLY_FAIR_ENABLED;
    else process.env.PROVABLY_FAIR_ENABLED = originalPfFlag;
    if (originalRgFlag === undefined) delete process.env.RG_TOOLS_ENABLED;
    else process.env.RG_TOOLS_ENABLED = originalRgFlag;
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Provably-fair endpoints — PROVABLY_FAIR_ENABLED
  // ───────────────────────────────────────────────────────────────────────────

  describe("fairness endpoints with flag OFF", () => {
    beforeEach(() => {
      delete process.env.PROVABLY_FAIR_ENABLED;
    });

    it.each([
      ["get", "/player/fairness"],
      ["post", "/player/fairness/client-seed"],
      ["post", "/player/fairness/rotate"]
    ] as const)("%s %s → 404 PROVABLY_FAIR_DISABLED", async (method, path) => {
      const res = await request(app.getHttpServer())[method](path).send({ clientSeed: "x" });
      expect(res.status).toBe(404);
      expect(res.body.code ?? res.body.message?.code).toBeDefined();
      expect(JSON.stringify(res.body)).toContain("PROVABLY_FAIR_DISABLED");
    });

    it("does not touch the fairness service while disabled", async () => {
      await request(app.getHttpServer()).get("/player/fairness");
      expect(fairnessService.getCommitment).not.toHaveBeenCalled();
    });
  });

  describe("fairness endpoints with flag ON", () => {
    beforeEach(() => {
      process.env.PROVABLY_FAIR_ENABLED = "true";
      jest.clearAllMocks();
    });

    it("GET /player/fairness returns the public commitment", async () => {
      const res = await request(app.getHttpServer()).get("/player/fairness");
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        serverSeedHash: COMMITMENT.serverSeedHash,
        clientSeed: COMMITMENT.clientSeed,
        nonce: COMMITMENT.nonce
      });
      // the active server seed must never appear in any response shape
      expect(JSON.stringify(res.body)).not.toContain("\"serverSeed\":");
    });

    it("POST client-seed accepts a valid seed", async () => {
      const res = await request(app.getHttpServer())
        .post("/player/fairness/client-seed")
        .send({ clientSeed: "lucky_777:A-b" });
      expect(res.status).toBe(201);
      expect(fairnessService.setClientSeed).toHaveBeenCalledWith(
        MOCK_AUTH_USER.id,
        "lucky_777:A-b"
      );
    });

    it.each([
      ["empty", ""],
      ["whitespace only", "   "],
      ["too long", "x".repeat(129)],
      ["shell metacharacters", "seed;rm -rf /"],
      ["HTML injection", "<script>alert(1)</script>"],
      ["unicode confusables", "seed‮evil"]
    ])("POST client-seed rejects %s with 400", async (_label, clientSeed) => {
      const res = await request(app.getHttpServer())
        .post("/player/fairness/client-seed")
        .send({ clientSeed });
      expect(res.status).toBe(400);
      expect(fairnessService.setClientSeed).not.toHaveBeenCalled();
    });

    it("POST client-seed rejects a missing body with 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/player/fairness/client-seed")
        .send({});
      expect(res.status).toBe(400);
    });

    it("POST rotate reveals the outgoing seed and issues a new commitment", async () => {
      const res = await request(app.getHttpServer()).post("/player/fairness/rotate");
      expect(res.status).toBe(201);
      expect(res.body.revealedServerSeed).toBe("b".repeat(64));
      expect(res.body.serverSeedHash).toBe(COMMITMENT.serverSeedHash);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // POST /player/spin — validation layer (flag gating covered at service level)
  // ───────────────────────────────────────────────────────────────────────────

  describe("POST /player/spin validation", () => {
    beforeEach(() => {
      process.env.PROVABLY_FAIR_ENABLED = "true";
      jest.clearAllMocks();
    });

    it("accepts a valid bet", async () => {
      const res = await request(app.getHttpServer()).post("/player/spin").send({ bet: 1.5 });
      expect([200, 201]).toContain(res.status);
      expect(playerService.resolveServerRound).toHaveBeenCalledWith(
        expect.objectContaining({ id: MOCK_AUTH_USER.id }),
        expect.objectContaining({ bet: 1.5 })
      );
    });

    it.each([
      ["zero", 0],
      ["negative", -5],
      ["NaN string", "abc"],
      ["Infinity", Infinity],
      ["null", null],
      ["missing", undefined]
    ])("rejects bet=%s with 400 before any service call", async (_label, bet) => {
      const res = await request(app.getHttpServer())
        .post("/player/spin")
        .send(bet === undefined ? {} : { bet });
      expect(res.status).toBe(400);
      expect(playerService.resolveServerRound).not.toHaveBeenCalled();
    });

    it("rejects an over-long profileId with 400", async () => {
      const res = await request(app.getHttpServer())
        .post("/player/spin")
        .send({ bet: 1, profileId: "p".repeat(101) });
      expect(res.status).toBe(400);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Responsible Gaming endpoints — validation layer
  // ───────────────────────────────────────────────────────────────────────────

  describe("responsible-gaming validation", () => {
    it("accepts a well-formed settings update", async () => {
      const res = await request(app.getHttpServer())
        .put("/player/responsible-gaming")
        .send({ depositLimitDaily: 100, lossLimitWeekly: 250.5, sessionTimeLimitMinutes: 60 });
      expect(res.status).toBe(200);
    });

    it("accepts explicit nulls (clearing a limit)", async () => {
      const res = await request(app.getHttpServer())
        .put("/player/responsible-gaming")
        .send({ depositLimitDaily: null });
      expect(res.status).toBe(200);
    });

    it("rejects unknown keys (strict schema)", async () => {
      const res = await request(app.getHttpServer())
        .put("/player/responsible-gaming")
        .send({ depositLimitDaily: 100, isAdmin: true });
      expect(res.status).toBe(400);
    });

    it.each([
      ["negative limit", { depositLimitDaily: -1 }],
      ["non-numeric limit", { lossLimitDaily: "all-in" }],
      ["negative session minutes", { sessionTimeLimitMinutes: -10 }]
    ])("rejects %s with 400", async (_label, body) => {
      const res = await request(app.getHttpServer())
        .put("/player/responsible-gaming")
        .send(body);
      expect(res.status).toBe(400);
    });

    it.each([
      ["zero hours", 0],
      ["above 30 days", 721],
      ["fractional", 1.5],
      ["negative", -24]
    ])("cooloff rejects durationHours=%s with 400", async (_label, durationHours) => {
      const res = await request(app.getHttpServer())
        .post("/player/responsible-gaming/cooloff")
        .send({ durationHours });
      expect(res.status).toBe(400);
    });

    it("cooloff accepts 1..720 hours", async () => {
      const res = await request(app.getHttpServer())
        .post("/player/responsible-gaming/cooloff")
        .send({ durationHours: 24 });
      expect([200, 201]).toContain(res.status);
    });

    it("self-exclusion enforces the regulatory minimum of 24h", async () => {
      const tooShort = await request(app.getHttpServer())
        .post("/player/responsible-gaming/self-exclude")
        .send({ durationHours: 23 });
      expect(tooShort.status).toBe(400);

      const ok = await request(app.getHttpServer())
        .post("/player/responsible-gaming/self-exclude")
        .send({ durationHours: 24 });
      expect([200, 201]).toContain(ok.status);
    });
  });
});
