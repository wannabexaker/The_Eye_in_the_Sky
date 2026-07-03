/**
 * ResponsibleGamingService — Unit Tests
 *
 * Covers the RG_TOOLS_ENABLED gating contract (404 on player endpoints, no-op
 * on enforcement hooks) and, with the flag on, the enforcement matrix:
 * self-exclusion, cool-off, session time limits, loss limits, deposit limits.
 * Prisma is replaced with an in-memory mock — no DB.
 */

import { HttpException, NotFoundException } from "@nestjs/common";
import { ResponsibleGamingService } from "./responsible-gaming.service";
import type { PrismaService } from "./prisma.service";

const USER_ID = "cuser0000000000000000000001";
const SESSION_ID = "csession00000000000000000001";

const originalFlag = process.env.RG_TOOLS_ENABLED;

afterEach(() => {
  if (originalFlag === undefined) {
    delete process.env.RG_TOOLS_ENABLED;
  } else {
    process.env.RG_TOOLS_ENABLED = originalFlag;
  }
});

const enable = () => {
  process.env.RG_TOOLS_ENABLED = "true";
};
const disable = () => {
  delete process.env.RG_TOOLS_ENABLED;
};

type SettingsRow = Record<string, unknown> & { userId: string };

const buildPrismaMock = (settingsRow: SettingsRow | null = null) => {
  const state = { settings: settingsRow };

  const playerResponsibleGaming = {
    findUnique: jest.fn(async () => state.settings),
    upsert: jest.fn(async ({ create, update }: { create: SettingsRow; update: Partial<SettingsRow> }) => {
      state.settings = state.settings
        ? ({ ...state.settings, ...update, updatedAt: new Date() } as SettingsRow)
        : ({
            createdAt: new Date(),
            updatedAt: new Date(),
            selfExclusionUntil: null,
            cooloffUntil: null,
            sessionTimeLimitMinutes: null,
            realityCheckIntervalMinutes: null,
            depositLimitDaily: null,
            depositLimitWeekly: null,
            depositLimitMonthly: null,
            lossLimitDaily: null,
            lossLimitWeekly: null,
            lossLimitMonthly: null,
            ...create
          } as SettingsRow);
      return state.settings;
    })
  };

  const ledgerEntry = { aggregate: jest.fn(async () => ({ _sum: { amount: 0 } })) };
  const round = {
    aggregate: jest.fn(async () => ({ _sum: { chargedBet: 0, totalWin: 0 } }))
  };
  const authSession = {
    findUnique: jest.fn(async () => ({ createdAt: new Date() }))
  };

  return { state, playerResponsibleGaming, ledgerEntry, round, authSession };
};

const buildService = (mock: ReturnType<typeof buildPrismaMock>) =>
  new ResponsibleGamingService(mock as unknown as PrismaService);

const expectRgError = async (
  promise: Promise<unknown>,
  status: number,
  code: string
) => {
  try {
    await promise;
    throw new Error(`expected rejection with ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(status);
    expect(((error as HttpException).getResponse() as { code: string }).code).toBe(code);
  }
};

describe("ResponsibleGamingService — flag gating", () => {
  it("player endpoints 404 with RG_TOOLS_DISABLED while the flag is off", async () => {
    disable();
    const service = buildService(buildPrismaMock());

    for (const call of [
      () => service.getSettings(USER_ID),
      () => service.updateSettings(USER_ID, {}),
      () => service.setCooloff(USER_ID, 24),
      () => service.setSelfExclusion(USER_ID, 24)
    ]) {
      try {
        await call();
        throw new Error("expected NotFoundException");
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
        expect((error as NotFoundException).getResponse()).toMatchObject({
          code: "RG_TOOLS_DISABLED"
        });
      }
    }
  });

  it("enforcement hooks are silent no-ops while the flag is off", async () => {
    disable();
    const mock = buildPrismaMock({
      userId: USER_ID,
      selfExclusionUntil: new Date(Date.now() + 86_400_000)
    });
    const service = buildService(mock);

    await expect(
      service.enforceRoundLimits(mock as never, USER_ID, SESSION_ID, 10, 0)
    ).resolves.toBeUndefined();
    await expect(
      service.enforceDepositLimit(mock as never, USER_ID, 10_000)
    ).resolves.toBeUndefined();
    // flag off ⇒ enforcement must not even read settings
    expect(mock.playerResponsibleGaming.findUnique).not.toHaveBeenCalled();
  });
});

describe("ResponsibleGamingService — flag on", () => {
  it("maps missing settings to an all-null DTO", async () => {
    enable();
    const service = buildService(buildPrismaMock(null));

    const dto = await service.getSettings(USER_ID);

    expect(dto.depositLimitDaily).toBeNull();
    expect(dto.lossLimitMonthly).toBeNull();
    expect(dto.selfExclusionUntil).toBeNull();
    expect(dto.cooloffUntil).toBeNull();
  });

  it("setCooloff stores a future timestamp of ~durationHours", async () => {
    enable();
    const mock = buildPrismaMock();
    const service = buildService(mock);

    const before = Date.now();
    const dto = await service.setCooloff(USER_ID, 48);
    const until = new Date(dto.cooloffUntil!).getTime();

    expect(until).toBeGreaterThanOrEqual(before + 47.9 * 3_600_000);
    expect(until).toBeLessThanOrEqual(Date.now() + 48 * 3_600_000);
  });

  it("setSelfExclusion stores a future timestamp of ~durationHours", async () => {
    enable();
    const service = buildService(buildPrismaMock());

    const dto = await service.setSelfExclusion(USER_ID, 24 * 30);
    expect(new Date(dto.selfExclusionUntil!).getTime()).toBeGreaterThan(
      Date.now() + 29 * 24 * 3_600_000
    );
  });

  describe("enforceRoundLimits", () => {
    it("blocks an actively self-excluded player with 403 SELF_EXCLUDED", async () => {
      enable();
      const mock = buildPrismaMock({
        userId: USER_ID,
        selfExclusionUntil: new Date(Date.now() + 3_600_000),
        cooloffUntil: null,
        sessionTimeLimitMinutes: null,
        lossLimitDaily: null,
        lossLimitWeekly: null,
        lossLimitMonthly: null
      });
      const service = buildService(mock);

      await expectRgError(
        service.enforceRoundLimits(mock as never, USER_ID, SESSION_ID, 1, 0),
        403,
        "SELF_EXCLUDED"
      );
    });

    it("blocks during an active cool-off, allows after it expires", async () => {
      enable();
      const active = buildPrismaMock({
        userId: USER_ID,
        selfExclusionUntil: null,
        cooloffUntil: new Date(Date.now() + 3_600_000),
        sessionTimeLimitMinutes: null,
        lossLimitDaily: null,
        lossLimitWeekly: null,
        lossLimitMonthly: null
      });
      await expectRgError(
        buildService(active).enforceRoundLimits(active as never, USER_ID, SESSION_ID, 1, 0),
        403,
        "SELF_EXCLUDED"
      );

      const expired = buildPrismaMock({
        userId: USER_ID,
        selfExclusionUntil: null,
        cooloffUntil: new Date(Date.now() - 1000),
        sessionTimeLimitMinutes: null,
        lossLimitDaily: null,
        lossLimitWeekly: null,
        lossLimitMonthly: null
      });
      await expect(
        buildService(expired).enforceRoundLimits(expired as never, USER_ID, SESSION_ID, 1, 0)
      ).resolves.toBeUndefined();
    });

    it("blocks when the session outlives sessionTimeLimitMinutes", async () => {
      enable();
      const mock = buildPrismaMock({
        userId: USER_ID,
        selfExclusionUntil: null,
        cooloffUntil: null,
        sessionTimeLimitMinutes: 30,
        lossLimitDaily: null,
        lossLimitWeekly: null,
        lossLimitMonthly: null
      });
      mock.authSession.findUnique.mockResolvedValue({
        createdAt: new Date(Date.now() - 31 * 60_000)
      });
      const service = buildService(mock);

      await expectRgError(
        service.enforceRoundLimits(mock as never, USER_ID, SESSION_ID, 1, 0),
        403,
        "SESSION_LIMIT_REACHED"
      );
    });

    it("blocks a round that would exceed the daily loss limit", async () => {
      enable();
      const mock = buildPrismaMock({
        userId: USER_ID,
        selfExclusionUntil: null,
        cooloffUntil: null,
        sessionTimeLimitMinutes: null,
        lossLimitDaily: 100,
        lossLimitWeekly: null,
        lossLimitMonthly: null
      });
      // already lost 95 in-window; a 10 bet with no win → projected 105 > 100
      mock.round.aggregate.mockResolvedValue({ _sum: { chargedBet: 95, totalWin: 0 } });
      const service = buildService(mock);

      await expectRgError(
        service.enforceRoundLimits(mock as never, USER_ID, SESSION_ID, 10, 0),
        403,
        "LOSS_LIMIT_REACHED"
      );
    });

    it("allows a round within the loss limit (wins offset losses)", async () => {
      enable();
      const mock = buildPrismaMock({
        userId: USER_ID,
        selfExclusionUntil: null,
        cooloffUntil: null,
        sessionTimeLimitMinutes: null,
        lossLimitDaily: 100,
        lossLimitWeekly: null,
        lossLimitMonthly: null
      });
      mock.round.aggregate.mockResolvedValue({ _sum: { chargedBet: 95, totalWin: 50 } });
      const service = buildService(mock);

      await expect(
        service.enforceRoundLimits(mock as never, USER_ID, SESSION_ID, 10, 0)
      ).resolves.toBeUndefined();
    });
  });

  describe("enforceDepositLimit", () => {
    it("blocks a deposit that would exceed the daily limit", async () => {
      enable();
      const mock = buildPrismaMock({
        userId: USER_ID,
        depositLimitDaily: 500,
        depositLimitWeekly: null,
        depositLimitMonthly: null
      });
      mock.ledgerEntry.aggregate.mockResolvedValue({ _sum: { amount: 450 } });
      const service = buildService(mock);

      await expectRgError(
        service.enforceDepositLimit(mock as never, USER_ID, 100),
        403,
        "DEPOSIT_LIMIT_EXCEEDED"
      );
    });

    it("allows deposits when the player has no settings row", async () => {
      enable();
      const mock = buildPrismaMock(null);
      const service = buildService(mock);

      await expect(
        service.enforceDepositLimit(mock as never, USER_ID, 10_000)
      ).resolves.toBeUndefined();
    });
  });
});
