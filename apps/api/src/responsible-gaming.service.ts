import { HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import type { PlayerResponsibleGaming, Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";

type ResponsibleGamingSettingsUpdate = {
  depositLimitDaily?: number | null;
  depositLimitWeekly?: number | null;
  depositLimitMonthly?: number | null;
  lossLimitDaily?: number | null;
  lossLimitWeekly?: number | null;
  lossLimitMonthly?: number | null;
  sessionTimeLimitMinutes?: number | null;
  realityCheckIntervalMinutes?: number | null;
};

type ResponsibleGamingErrorCode =
  | "DEPOSIT_LIMIT_EXCEEDED"
  | "LOSS_LIMIT_REACHED"
  | "RG_TOOLS_DISABLED"
  | "SELF_EXCLUDED"
  | "SESSION_LIMIT_REACHED";

export type ResponsibleGamingSettingsDto = {
  depositLimitDaily: number | null;
  depositLimitWeekly: number | null;
  depositLimitMonthly: number | null;
  lossLimitDaily: number | null;
  lossLimitWeekly: number | null;
  lossLimitMonthly: number | null;
  sessionTimeLimitMinutes: number | null;
  realityCheckIntervalMinutes: number | null;
  selfExclusionUntil: string | null;
  cooloffUntil: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const MONTH_MS = 30 * DAY_MS;

const roundCurrency = (value: number) => Number(value.toFixed(2));

const toNumberOrNull = (value: Prisma.Decimal | null | undefined) =>
  value === null || value === undefined ? null : Number(value);

const normalizeMoneyLimit = (value: number | null | undefined) =>
  value === undefined ? undefined : value === null ? null : roundCurrency(value);

const addHours = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000);

const responsibleGamingError = (
  status: HttpStatus,
  code: ResponsibleGamingErrorCode,
  message: string
) =>
  new HttpException(
    {
      code,
      message
    },
    status
  );

@Injectable()
export class ResponsibleGamingService {
  constructor(private readonly prisma: PrismaService) {}

  isEnabled() {
    return process.env.RG_TOOLS_ENABLED === "true";
  }

  private assertToolsEnabled() {
    if (!this.isEnabled()) {
      throw new NotFoundException({
        code: "RG_TOOLS_DISABLED",
        message: "Responsible Gaming tools are disabled."
      });
    }
  }

  private mapSettings(settings: PlayerResponsibleGaming | null): ResponsibleGamingSettingsDto {
    return {
      depositLimitDaily: toNumberOrNull(settings?.depositLimitDaily),
      depositLimitWeekly: toNumberOrNull(settings?.depositLimitWeekly),
      depositLimitMonthly: toNumberOrNull(settings?.depositLimitMonthly),
      lossLimitDaily: toNumberOrNull(settings?.lossLimitDaily),
      lossLimitWeekly: toNumberOrNull(settings?.lossLimitWeekly),
      lossLimitMonthly: toNumberOrNull(settings?.lossLimitMonthly),
      sessionTimeLimitMinutes: settings?.sessionTimeLimitMinutes ?? null,
      realityCheckIntervalMinutes: settings?.realityCheckIntervalMinutes ?? null,
      selfExclusionUntil: settings?.selfExclusionUntil?.toISOString() ?? null,
      cooloffUntil: settings?.cooloffUntil?.toISOString() ?? null,
      createdAt: settings?.createdAt.toISOString() ?? null,
      updatedAt: settings?.updatedAt.toISOString() ?? null
    };
  }

  async getSettings(userId: string): Promise<ResponsibleGamingSettingsDto> {
    this.assertToolsEnabled();

    const settings = await this.prisma.playerResponsibleGaming.findUnique({
      where: { userId }
    });

    return this.mapSettings(settings);
  }

  async updateSettings(
    userId: string,
    input: ResponsibleGamingSettingsUpdate
  ): Promise<ResponsibleGamingSettingsDto> {
    this.assertToolsEnabled();

    const updateData: Prisma.PlayerResponsibleGamingUncheckedUpdateInput = {};
    const createData: Prisma.PlayerResponsibleGamingUncheckedCreateInput = { userId };

    if (input.depositLimitDaily !== undefined) {
      const value = normalizeMoneyLimit(input.depositLimitDaily);
      updateData.depositLimitDaily = value;
      createData.depositLimitDaily = value;
    }
    if (input.depositLimitWeekly !== undefined) {
      const value = normalizeMoneyLimit(input.depositLimitWeekly);
      updateData.depositLimitWeekly = value;
      createData.depositLimitWeekly = value;
    }
    if (input.depositLimitMonthly !== undefined) {
      const value = normalizeMoneyLimit(input.depositLimitMonthly);
      updateData.depositLimitMonthly = value;
      createData.depositLimitMonthly = value;
    }
    if (input.lossLimitDaily !== undefined) {
      const value = normalizeMoneyLimit(input.lossLimitDaily);
      updateData.lossLimitDaily = value;
      createData.lossLimitDaily = value;
    }
    if (input.lossLimitWeekly !== undefined) {
      const value = normalizeMoneyLimit(input.lossLimitWeekly);
      updateData.lossLimitWeekly = value;
      createData.lossLimitWeekly = value;
    }
    if (input.lossLimitMonthly !== undefined) {
      const value = normalizeMoneyLimit(input.lossLimitMonthly);
      updateData.lossLimitMonthly = value;
      createData.lossLimitMonthly = value;
    }
    if (input.sessionTimeLimitMinutes !== undefined) {
      updateData.sessionTimeLimitMinutes = input.sessionTimeLimitMinutes;
      createData.sessionTimeLimitMinutes = input.sessionTimeLimitMinutes;
    }
    if (input.realityCheckIntervalMinutes !== undefined) {
      updateData.realityCheckIntervalMinutes = input.realityCheckIntervalMinutes;
      createData.realityCheckIntervalMinutes = input.realityCheckIntervalMinutes;
    }

    const settings = await this.prisma.playerResponsibleGaming.upsert({
      where: { userId },
      create: createData,
      update: updateData
    });

    return this.mapSettings(settings);
  }

  async setCooloff(userId: string, durationHours: number): Promise<ResponsibleGamingSettingsDto> {
    this.assertToolsEnabled();

    const until = addHours(durationHours);
    const settings = await this.prisma.playerResponsibleGaming.upsert({
      where: { userId },
      create: { userId, cooloffUntil: until },
      update: { cooloffUntil: until }
    });

    return this.mapSettings(settings);
  }

  async setSelfExclusion(userId: string, durationHours: number): Promise<ResponsibleGamingSettingsDto> {
    this.assertToolsEnabled();

    const until = addHours(durationHours);
    const settings = await this.prisma.playerResponsibleGaming.upsert({
      where: { userId },
      create: { userId, selfExclusionUntil: until },
      update: { selfExclusionUntil: until }
    });

    return this.mapSettings(settings);
  }

  async enforceDepositLimit(
    transaction: Prisma.TransactionClient,
    userId: string,
    amount: number
  ) {
    if (!this.isEnabled()) {
      return;
    }

    const settings = await transaction.playerResponsibleGaming.findUnique({
      where: { userId }
    });

    if (!settings) {
      return;
    }

    const limits = [
      { label: "daily", limit: settings.depositLimitDaily, windowMs: DAY_MS },
      { label: "weekly", limit: settings.depositLimitWeekly, windowMs: WEEK_MS },
      { label: "monthly", limit: settings.depositLimitMonthly, windowMs: MONTH_MS }
    ] as const;

    const now = new Date();
    for (const entry of limits) {
      const limit = toNumberOrNull(entry.limit);
      if (limit === null) {
        continue;
      }

      const aggregate = await transaction.ledgerEntry.aggregate({
        where: {
          reason: "deposit",
          wallet: { userId },
          createdAt: { gte: new Date(now.getTime() - entry.windowMs) }
        },
        _sum: { amount: true }
      });
      const deposited = Number(aggregate._sum.amount ?? 0);

      if (roundCurrency(deposited + amount) > limit) {
        throw responsibleGamingError(
          HttpStatus.FORBIDDEN,
          "DEPOSIT_LIMIT_EXCEEDED",
          `Deposit would exceed the ${entry.label} deposit limit.`
        );
      }
    }
  }

  async enforceRoundLimits(
    transaction: Prisma.TransactionClient,
    userId: string,
    sessionId: string,
    chargedBet: number,
    totalWin: number
  ) {
    if (!this.isEnabled()) {
      return;
    }

    const settings = await transaction.playerResponsibleGaming.findUnique({
      where: { userId }
    });

    if (!settings) {
      return;
    }

    const now = new Date();
    if (settings.selfExclusionUntil && settings.selfExclusionUntil > now) {
      throw responsibleGamingError(
        HttpStatus.FORBIDDEN,
        "SELF_EXCLUDED",
        "Player is self-excluded."
      );
    }

    if (settings.cooloffUntil && settings.cooloffUntil > now) {
      throw responsibleGamingError(
        HttpStatus.FORBIDDEN,
        "SELF_EXCLUDED",
        "Player is in an active cool-off period."
      );
    }

    if (settings.sessionTimeLimitMinutes !== null) {
      const session = await transaction.authSession.findUnique({
        where: { id: sessionId },
        select: { createdAt: true }
      });
      if (session) {
        const sessionAgeMinutes = (now.getTime() - session.createdAt.getTime()) / 60_000;
        if (sessionAgeMinutes > settings.sessionTimeLimitMinutes) {
          throw responsibleGamingError(
            HttpStatus.FORBIDDEN,
            "SESSION_LIMIT_REACHED",
            "Session time limit has been reached."
          );
        }
      }
    }

    const limits = [
      { label: "daily", limit: settings.lossLimitDaily, windowMs: DAY_MS },
      { label: "weekly", limit: settings.lossLimitWeekly, windowMs: WEEK_MS },
      { label: "monthly", limit: settings.lossLimitMonthly, windowMs: MONTH_MS }
    ] as const;

    for (const entry of limits) {
      const limit = toNumberOrNull(entry.limit);
      if (limit === null) {
        continue;
      }

      const aggregate = await transaction.round.aggregate({
        where: {
          userId,
          createdAt: { gte: new Date(now.getTime() - entry.windowMs) }
        },
        _sum: {
          chargedBet: true,
          totalWin: true
        }
      });
      const projectedLoss = Math.max(
        0,
        Number(aggregate._sum.chargedBet ?? 0) +
          chargedBet -
          Number(aggregate._sum.totalWin ?? 0) -
          totalWin
      );

      if (roundCurrency(projectedLoss) > limit) {
        throw responsibleGamingError(
          HttpStatus.FORBIDDEN,
          "LOSS_LIMIT_REACHED",
          `Round would exceed the ${entry.label} loss limit.`
        );
      }
    }
  }
}
