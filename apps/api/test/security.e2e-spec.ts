/**
 * Security E2E Tests — Validation Layer
 *
 * Verifies that all API endpoints correctly reject malicious or malformed input
 * BEFORE any service or database interaction occurs.
 *
 * Strategy:
 * - Isolated TestingModule (no PrismaService, no DB)
 * - All service providers replaced with jest.fn() mocks
 * - All guards overridden: rate limiting disabled, auth always resolves
 * - DatabaseErrorFilter registered to mirror production error shape
 * - Each test targets a specific attack vector or boundary condition
 */

import { type INestApplication } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test, type TestingModule } from "@nestjs/testing";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require("supertest") as typeof import("supertest");

import { AnalyticsController } from "../src/analytics.controller";
import { AnalyticsService } from "../src/analytics.service";
import { AuthController } from "../src/auth.controller";
import { AuthModeService } from "../src/auth-mode.service";
import { AuthNonceReplayService } from "../src/auth-nonce-replay.service";
import { AuthService } from "../src/auth.service";
import { DatabaseErrorFilter } from "../src/db-error.filter";
import {
  AdminGuard,
  ExternalAuthPolicyGuard,
  InternalAuthPolicyGuard,
  SessionAuthGuard
} from "../src/auth.guard";
import { PlatformExchangeValidatorService } from "../src/platform-exchange-validator.service";
import { PlayerController } from "../src/player.controller";
import { PlayerService } from "../src/player.service";
import { BootstrapService } from "../src/bootstrap.service";

const MOCK_AUTH_USER = { id: "ctest001234567890123456789", email: "test@example.com", role: "player" };

/** SessionAuthGuard mock: always resolves and injects a test user */
const mockSessionGuard = {
  canActivate: (ctx: import("@nestjs/common").ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest();
    req.authUser = MOCK_AUTH_USER;
    return true;
  }
};

const mockAllow = { canActivate: () => true };

describe("Security: Validation Layer (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot({ throttlers: [{ ttl: 60_000, limit: 10_000 }] })
      ],
      controllers: [AuthController, PlayerController, AnalyticsController],
      providers: [
        // ── Service mocks ──────────────────────────────────────────────────
        {
          provide: AuthService,
          useValue: {
            registerPlayer: jest.fn().mockResolvedValue({ id: MOCK_AUTH_USER.id }),
            login: jest.fn().mockResolvedValue({ id: MOCK_AUTH_USER.id }),
            getCurrentSession: jest.fn().mockResolvedValue(null),
            logout: jest.fn().mockResolvedValue(undefined),
            resolveCurrentUser: jest.fn().mockResolvedValue(MOCK_AUTH_USER)
          }
        },
        {
          provide: AuthModeService,
          useValue: {
            isInternalAuthAllowed: jest.fn().mockResolvedValue(true),
            isExternalAuthAllowed: jest.fn().mockResolvedValue(true),
            getPublicConfig: jest.fn().mockResolvedValue({ mode: "HYBRID" })
          }
        },
        {
          provide: PlatformExchangeValidatorService,
          useValue: {
            validate: jest.fn().mockResolvedValue({ playerId: "ext-player-1" })
          }
        },
        {
          provide: AuthNonceReplayService,
          useValue: {
            checkAndStore: jest.fn().mockResolvedValue(true)
          }
        },
        {
          provide: PlayerService,
          useValue: {
            getBootstrap: jest.fn().mockResolvedValue({ balance: 1000 }),
            claimWelcomeBonus: jest.fn().mockResolvedValue({ granted: true }),
            deposit: jest.fn().mockResolvedValue({ balance: 1100 }),
            withdraw: jest.fn().mockResolvedValue({ balance: 900 }),
            persistRound: jest.fn().mockResolvedValue({ id: "round-test" })
          }
        },
        {
          provide: AnalyticsService,
          useValue: {
            ingest: jest.fn().mockResolvedValue({ accepted: 1, totalRounds: 1 }),
            getSummary: jest.fn().mockResolvedValue({ totalRounds: 0 }),
            getDashboard: jest.fn().mockResolvedValue([]),
            listRounds: jest.fn().mockResolvedValue([]),
            reset: jest.fn().mockResolvedValue({ deleted: 0 })
          }
        },
        {
          provide: BootstrapService,
          useValue: {}
        },
        // ── Rate limiting: unlimited during tests ───────────────────────────
        { provide: APP_GUARD, useClass: ThrottlerGuard }
      ]
    })
      // Override guards — no DB lookups, all pass
      .overrideGuard(ThrottlerGuard).useValue(mockAllow)
      .overrideGuard(SessionAuthGuard).useValue(mockSessionGuard)
      .overrideGuard(AdminGuard).useValue(mockAllow)
      .overrideGuard(InternalAuthPolicyGuard).useValue(mockAllow)
      .overrideGuard(ExternalAuthPolicyGuard).useValue(mockAllow)
      .compile();

    app = module.createNestApplication();
    app.useGlobalFilters(new DatabaseErrorFilter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /auth/register
  // ─────────────────────────────────────────────────────────────────────────

  describe("POST /auth/register", () => {
    const endpoint = "/auth/register";

    it("accepts valid registration input", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ email: "valid@example.com", password: "SecurePass1!", displayName: "Player" });
      expect([200, 201]).toContain(res.status);
    });

    it("returns 400 for SQL injection in email: single quote", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ email: "'; DROP TABLE users; --@x.com", password: "SecurePass1!", displayName: "Player" });
      expect(res.status).toBe(400);
    });

    it("returns 400 for SQL injection in email: UNION SELECT", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ email: "x' UNION SELECT 1,2,3--@x.com", password: "SecurePass1!", displayName: "Player" });
      expect(res.status).toBe(400);
    });

    it("returns 400 for XSS payload in displayName", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ email: "test@example.com", password: "SecurePass1!", displayName: "<script>alert(1)</script>" });
      expect(res.status).toBe(400);
    });

    it("returns 400 for HTML injection in displayName", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ email: "test@example.com", password: "SecurePass1!", displayName: '<img src=x onerror=alert(1)>' });
      expect(res.status).toBe(400);
    });

    it("returns 400 for password shorter than 8 chars", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ email: "test@example.com", password: "1234567", displayName: "Player" });
      expect(res.status).toBe(400);
    });

    it("returns 400 for single-char displayName", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ email: "test@example.com", password: "SecurePass1!", displayName: "A" });
      expect(res.status).toBe(400);
    });

    it("returns 400 with structured field-level error details", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ email: "bad", password: "SecurePass1!", displayName: "Player" });
      expect(res.status).toBe(400);
      // NestJS wraps BadRequestException object body under res.body.message
      const payload = res.body.message ?? res.body;
      expect(payload.error).toBe("Validation failed");
      expect(Array.isArray(payload.details)).toBe(true);
      expect((payload.details as Array<{ path: string }>).length).toBeGreaterThan(0);
    });

    it("returns 400 for completely empty body", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /auth/login
  // ─────────────────────────────────────────────────────────────────────────

  describe("POST /auth/login", () => {
    const endpoint = "/auth/login";

    it("accepts valid login", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ email: "player@example.com", password: "anypassword" });
      expect([200, 201]).toContain(res.status);
    });

    it("returns 400 for SQL injection in login email: OR 1=1", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ email: "' OR '1'='1", password: "anything" });
      expect(res.status).toBe(400);
    });

    it("returns 400 for UNION SELECT in email", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ email: "admin'--@x.com UNION SELECT NULL--", password: "x" });
      expect(res.status).toBe(400);
    });

    it("returns 400 for empty password", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ email: "player@example.com", password: "" });
      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /player/wallet/deposit
  // ─────────────────────────────────────────────────────────────────────────

  describe("POST /player/wallet/deposit", () => {
    const endpoint = "/player/wallet/deposit";

    it("accepts valid deposit", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ amount: 100.00 });
      expect(res.status).toBeLessThan(300);
    });

    it("returns 400 for negative amount", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ amount: -50 });
      expect(res.status).toBe(400);
    });

    it("returns 400 for zero amount", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ amount: 0 });
      expect(res.status).toBe(400);
    });

    it("returns 400 for amount exceeding 1,000,000", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ amount: 2_000_000 });
      expect(res.status).toBe(400);
    });

    it("returns 400 for amount with more than 2 decimal places", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ amount: 10.001 });
      expect(res.status).toBe(400);
    });

    it("returns 400 for string injection in amount", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ amount: "100'; DELETE FROM wallets--" });
      expect(res.status).toBe(400);
    });

    it("returns 400 for NaN-encoded amount", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ amount: null });
      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /player/wallet/withdraw
  // ─────────────────────────────────────────────────────────────────────────

  describe("POST /player/wallet/withdraw", () => {
    const endpoint = "/player/wallet/withdraw";

    it("returns 400 for negative withdraw amount", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ amount: -10 });
      expect(res.status).toBe(400);
    });

    it("returns 400 for string inject in withdraw amount", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ amount: "0; EXEC xp_cmdshell('dir')" });
      expect(res.status).toBe(400);
    });

    it("accepts a valid withdraw request", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ amount: 50.00 });
      expect(res.status).toBeLessThan(300);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /analytics/ingest
  // ─────────────────────────────────────────────────────────────────────────

  describe("POST /analytics/ingest", () => {
    const endpoint = "/analytics/ingest";

    const validEntry = {
      id: "round-test-001",
      timestamp: 1700000000,
      variant: "2.0",
      bet: 1.0,
      win: 0.0,
      net: -1.0,
      mode: "base",
      cascades: 0,
      bonusTriggered: false,
      multiplier: 1.0,
      winMultiple: 0.0,
      tier: "loss",
      balanceAfter: 99.0
    };

    it("accepts a valid single-entry ingest", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ entries: [validEntry] });
      expect(res.status).toBeLessThan(300);
    });

    it("returns 400 for missing entries field", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({});
      expect(res.status).toBe(400);
    });

    it("returns 4xx for more than 5000 entries (payload too large or validation error)", async () => {
      const bulk = Array.from({ length: 5001 }, (_, i) => ({ ...validEntry, id: `round-${i}` }));
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ entries: bulk });
      // 413 = Express payload limit hit before validator; 400 = validator catches it first
      expect([400, 413]).toContain(res.status);
    });

    it("returns 400 for invalid tier value", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ entries: [{ ...validEntry, tier: "jackpot_hack" }] });
      expect(res.status).toBe(400);
    });

    it("returns 400 for path-traversal in entry id", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ entries: [{ ...validEntry, id: "../../etc/passwd" }] });
      expect(res.status).toBe(400);
    });

    it("returns 400 for Infinity in win field", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ entries: [{ ...validEntry, win: 1e309 }] });
      expect(res.status).toBe(400);
    });

    it("returns 400 for negative timestamp", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ entries: [{ ...validEntry, timestamp: -1000 }] });
      expect(res.status).toBe(400);
    });

    it("returns 400 for unknown variant", async () => {
      const res = await request(app.getHttpServer())
        .post(endpoint)
        .send({ entries: [{ ...validEntry, variant: "unknown_variant" }] });
      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /analytics/rounds (admin — query param injection)
  // ─────────────────────────────────────────────────────────────────────────

  describe("GET /analytics/rounds", () => {
    const endpoint = "/analytics/rounds";

    it("returns 2xx for valid query", async () => {
      const res = await request(app.getHttpServer())
        .get(endpoint)
        .query({ limit: "100", variant: "2.0" });
      expect(res.status).toBeLessThan(300);
    });

    it("returns 400 for SQL injection in limit param", async () => {
      const res = await request(app.getHttpServer())
        .get(endpoint)
        .query({ limit: "1; DROP TABLE rounds--" });
      expect(res.status).toBe(400);
    });

    it("returns 400 for non-numeric limit", async () => {
      const res = await request(app.getHttpServer())
        .get(endpoint)
        .query({ limit: "abc" });
      expect(res.status).toBe(400);
    });

    it("returns 400 for unknown variant", async () => {
      const res = await request(app.getHttpServer())
        .get(endpoint)
        .query({ variant: "malicious_value'; DELETE FROM rounds--" });
      expect(res.status).toBe(400);
    });
  });
});
