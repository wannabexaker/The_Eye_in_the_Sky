import { initialGameState, type BonusState, type GameState, type SpinResult } from "@eye/game-engine";
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException
} from "@nestjs/common";
import type {
  AuthUserDto,
  PlayerSnapshotDto,
  WalletMutationRequestDto,
  WalletTransactionDto
} from "@eye/shared-types";
import type { Prisma, User } from "@prisma/client";
import { PRIMARY_GAME_KEY } from "./bootstrap-data";
import type { CurrentAuthUser } from "./auth.types";
import { PrismaService } from "./prisma.service";
import { ResponsibleGamingService } from "./responsible-gaming.service";

const WELCOME_BONUS_AMOUNT = 500;
const DEFAULT_PAYMENT_METHOD = {
  id: "pm-default-card",
  type: "card" as const,
  label: "Temple Visa",
  last4: "4242"
};

const roundCurrency = (value: number) => Number(value.toFixed(2));

const parseJsonValue = <T>(value: string | null | undefined): T | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const mapUser = (user: Pick<User, "id" | "email" | "displayName" | "role">): AuthUserDto => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  role: user.role === "admin" ? "admin" : "player"
});

const mapWalletTransaction = (
  entry: {
    id: string;
    createdAt: Date;
    reason: string;
    amount: Prisma.Decimal;
    balanceAfter: Prisma.Decimal;
    metadataJson: string | null;
  }
): WalletTransactionDto => {
  const metadata = parseJsonValue<{ label?: string; method?: string }>(entry.metadataJson);
  const rawAmount = Number(entry.amount);
  const balanceAfter = Number(entry.balanceAfter);

  let type: WalletTransactionDto["type"] = "bet";
  if (entry.reason === "deposit") {
    type = "deposit";
  } else if (entry.reason === "withdrawal") {
    type = "withdrawal";
  } else if (entry.reason === "welcome_bonus") {
    type = "welcome_bonus";
  } else if (entry.reason === "round_win") {
    type = "win";
  }

  return {
    id: entry.id,
    timestamp: entry.createdAt.toISOString(),
    type,
    amount: Math.abs(rawAmount),
    balanceAfter,
    method: metadata?.method,
    label:
      metadata?.label ??
      (type === "welcome_bonus"
        ? "Welcome Bonus"
        : type === "deposit"
          ? "Deposit"
          : type === "withdrawal"
            ? "Withdrawal"
            : type === "win"
              ? "Win"
              : "Bet")
  };
};

@Injectable()
export class PlayerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly responsibleGamingService: ResponsibleGamingService
  ) {}

  private async getPrimaryGame() {
    const game = await this.prisma.game.findUnique({ where: { key: PRIMARY_GAME_KEY } });
    if (!game) {
      throw new InternalServerErrorException("Primary game is not bootstrapped.");
    }
    return game;
  }

  private async buildPlayerSnapshot(userId: string): Promise<PlayerSnapshotDto> {
    const [user, wallet, latestSession, walletEntries] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.wallet.findUnique({ where: { userId } }),
      this.prisma.gameSession.findFirst({
        where: { userId, game: { key: PRIMARY_GAME_KEY } },
        orderBy: { lastActiveAt: "desc" }
      }),
      this.prisma.ledgerEntry.findMany({
        where: { wallet: { userId } },
        orderBy: { createdAt: "desc" },
        take: 50
      })
    ]);

    if (!user || !wallet) {
      throw new InternalServerErrorException("Player wallet is not initialized.");
    }

    const [depositAggregate, withdrawalAggregate] = await Promise.all([
      this.prisma.ledgerEntry.aggregate({
        where: { walletId: wallet.id, reason: "deposit" },
        _sum: { amount: true }
      }),
      this.prisma.ledgerEntry.aggregate({
        where: { walletId: wallet.id, reason: "withdrawal" },
        _sum: { amount: true }
      })
    ]);

    const totalDeposited = Number(depositAggregate._sum.amount ?? 0);
    const totalWithdrawn = Math.abs(Number(withdrawalAggregate._sum.amount ?? 0));
    const persistedState =
      parseJsonValue<GameState>(latestSession?.stateJson) ?? initialGameState(Number(wallet.balance));

    return {
      user: mapUser(user),
      wallet: {
        balance: Number(wallet.balance),
        currency: wallet.currencyCode === "EUR" ? "EUR" : "EUR"
      },
      totalDeposited,
      totalWithdrawn,
      welcomeClaimed: user.welcomeBonusClaimed,
      walletTransactions: walletEntries.map(mapWalletTransaction),
      gameStateSnapshot: persistedState,
      sessionId: latestSession?.id ?? null,
      paymentMethods: [DEFAULT_PAYMENT_METHOD]
    };
  }

  async getBootstrap(currentUser: CurrentAuthUser) {
    return this.buildPlayerSnapshot(currentUser.id);
  }

  async claimWelcomeBonus(currentUser: CurrentAuthUser) {
    await this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({ where: { id: currentUser.id } });
      const wallet = await transaction.wallet.findUnique({ where: { userId: currentUser.id } });

      if (!user || !wallet) {
        throw new InternalServerErrorException("Player wallet is unavailable.");
      }

      if (user.welcomeBonusClaimed) {
        return;
      }

      const balanceAfter = roundCurrency(Number(wallet.balance) + WELCOME_BONUS_AMOUNT);

      await transaction.user.update({
        where: { id: currentUser.id },
        data: { welcomeBonusClaimed: true }
      });

      await transaction.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter }
      });

      await transaction.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          reason: "welcome_bonus",
          amount: WELCOME_BONUS_AMOUNT,
          balanceAfter,
          metadataJson: JSON.stringify({ label: "Welcome Bonus" })
        }
      });
    });

    return this.buildPlayerSnapshot(currentUser.id);
  }

  async deposit(currentUser: CurrentAuthUser, payload: WalletMutationRequestDto) {
    const amount = roundCurrency(Number(payload.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException("Deposit amount must be greater than zero.");
    }

    await this.prisma.$transaction(async (transaction) => {
      const wallet = await transaction.wallet.findUnique({ where: { userId: currentUser.id } });
      if (!wallet) {
        throw new InternalServerErrorException("Player wallet is unavailable.");
      }

      await this.responsibleGamingService.enforceDepositLimit(
        transaction,
        currentUser.id,
        amount
      );

      const balanceAfter = roundCurrency(Number(wallet.balance) + amount);

      await transaction.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter }
      });

      await transaction.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          reason: "deposit",
          amount,
          balanceAfter,
          metadataJson: JSON.stringify({
            label: "Deposit",
            method: payload.methodLabel ?? "Simulated Card"
          })
        }
      });
    });

    return this.buildPlayerSnapshot(currentUser.id);
  }

  async withdraw(currentUser: CurrentAuthUser, payload: WalletMutationRequestDto) {
    const amount = roundCurrency(Number(payload.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException("Withdrawal amount must be greater than zero.");
    }

    await this.prisma.$transaction(async (transaction) => {
      const wallet = await transaction.wallet.findUnique({ where: { userId: currentUser.id } });
      if (!wallet) {
        throw new InternalServerErrorException("Player wallet is unavailable.");
      }

      const currentBalance = Number(wallet.balance);
      if (amount > currentBalance) {
        throw new BadRequestException("Insufficient balance for withdrawal.");
      }

      const balanceAfter = roundCurrency(currentBalance - amount);

      await transaction.wallet.update({
        where: { id: wallet.id },
        data: { balance: balanceAfter }
      });

      await transaction.ledgerEntry.create({
        data: {
          walletId: wallet.id,
          reason: "withdrawal",
          amount: -amount,
          balanceAfter,
          metadataJson: JSON.stringify({
            label: "Withdrawal",
            method: payload.methodLabel ?? "Temple Visa"
          })
        }
      });
    });

    return this.buildPlayerSnapshot(currentUser.id);
  }

  async persistRound(
    currentUser: CurrentAuthUser,
    payload: { profileId?: string; result?: SpinResult }
  ) {
    const result = payload.result;
    if (!result || !result.roundSummary?.roundId || !result.nextState) {
      throw new BadRequestException("A valid spin result payload is required.");
    }

    // Validate bet amounts BEFORE hitting the DB constraints
    const betValue = roundCurrency(Number(result.bet));
    const chargedBetValue = roundCurrency(Number(result.debugMetadata?.chargedBet ?? 0));
    const totalWinValue = roundCurrency(Number(result.totalWin));

    if (!Number.isFinite(betValue) || betValue <= 0) {
      throw new BadRequestException("Bet must be greater than zero.");
    }
    if (!Number.isFinite(chargedBetValue) || chargedBetValue < 0) {
      throw new BadRequestException("Charged bet cannot be negative.");
    }
    if (!Number.isFinite(totalWinValue) || totalWinValue < 0) {
      throw new BadRequestException("Total win cannot be negative.");
    }

    const game = await this.getPrimaryGame();

    await this.prisma.$transaction(async (transaction) => {
      const existingRound = await transaction.round.findUnique({
        where: { id: result.roundSummary.roundId }
      });

      if (existingRound) {
        if (existingRound.userId !== currentUser.id) {
          throw new BadRequestException("Round ID already belongs to a different user.");
        }

        return;
      }

      const wallet = await transaction.wallet.findUnique({ where: { userId: currentUser.id } });
      if (!wallet) {
        throw new InternalServerErrorException("Player wallet is unavailable.");
      }

      await this.responsibleGamingService.enforceRoundLimits(
        transaction,
        currentUser.id,
        currentUser.sessionId,
        chargedBetValue,
        totalWinValue
      );

      const profileId = payload.profileId?.trim() || "math_base_v2_0";
      const existingSession = await transaction.gameSession.findUnique({
        where: {
          userId_gameId: {
            userId: currentUser.id,
            gameId: game.id
          }
        }
      });

      const previousBalance = Number(wallet.balance);
      const chargedBet = chargedBetValue;
      const totalWin = totalWinValue;
      const balanceAfterBet = roundCurrency(previousBalance - chargedBet);
      const finalBalance = roundCurrency(balanceAfterBet + totalWin);

      const round = await transaction.round.upsert({
        where: { id: result.roundSummary.roundId },
        update: {
          profileId,
          configVersion: result.configVersion,
          seedUsed: String(result.seedUsed),
          mode: result.mode,
          chargedBet,
          bet: betValue,
          totalWin,
          walletDelta: roundCurrency(Number(result.walletDelta)),
          initialBoardJson: JSON.stringify(result.initialBoard),
          resultJson: JSON.stringify(result),
          gameSessionId: existingSession?.id ?? null
        },
        create: {
          id: result.roundSummary.roundId,
          userId: currentUser.id,
          gameId: game.id,
          gameSessionId: existingSession?.id ?? null,
          profileId,
          configVersion: result.configVersion,
          seedUsed: String(result.seedUsed),
          mode: result.mode,
          chargedBet,
          bet: betValue,
          totalWin,
          walletDelta: roundCurrency(Number(result.walletDelta)),
          initialBoardJson: JSON.stringify(result.initialBoard),
          resultJson: JSON.stringify(result),
          createdAt: new Date(result.roundSummary.timestamp)
        }
      });

      await transaction.ledgerEntry.deleteMany({
        where: {
          roundId: round.id,
          reason: { in: ["round_bet", "round_win"] }
        }
      });

      if (chargedBet > 0) {
        await transaction.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            roundId: round.id,
            reason: "round_bet",
            amount: -chargedBet,
            balanceAfter: balanceAfterBet,
            metadataJson: JSON.stringify({
              label: `Bet x${result.appliedWinMultiplier}`
            })
          }
        });
      }

      if (totalWin > 0) {
        await transaction.ledgerEntry.create({
          data: {
            walletId: wallet.id,
            roundId: round.id,
            reason: "round_win",
            amount: totalWin,
            balanceAfter: finalBalance,
            metadataJson: JSON.stringify({
              label: result.bonusTriggered ? "Win | Bonus Triggered" : "Win"
            })
          }
        });
      }

      await transaction.wallet.update({
        where: { id: wallet.id },
        data: { balance: finalBalance }
      });

      const sessionData = {
        activeProfileId: profileId,
        configVersion: result.configVersion,
        stateJson: JSON.stringify(result.nextState),
        lastRoundId: round.id,
        lastActiveAt: new Date()
      };

      if (existingSession) {
        await transaction.gameSession.update({
          where: { id: existingSession.id },
          data: sessionData
        });
      } else {
        await transaction.gameSession.create({
          data: {
            userId: currentUser.id,
            gameId: game.id,
            ...sessionData
          }
        });
      }

      await transaction.bonusState.create({
        data: {
          userId: currentUser.id,
          roundId: round.id,
          mode: result.nextState.bonusState?.mode ?? "sky_opens",
          freeSpinsRemaining: result.nextState.bonusState?.freeSpinsRemaining ?? 0,
          stickyMultiplier: result.nextState.bonusState?.stickyMultiplier ?? 0,
          totalBonusWin: roundCurrency(result.nextState.bonusState?.totalBonusWin ?? 0),
          betPerSpin: roundCurrency(result.nextState.bonusState?.betPerSpin ?? 0),
          initialBonusBudget: roundCurrency(result.nextState.bonusState?.initialBonusBudget ?? 0),
          remainingBonusBudget: roundCurrency(result.nextState.bonusState?.remainingBonusBudget ?? 0),
          preBonusBet: roundCurrency(result.nextState.bonusState?.preBonusBet ?? 0),
          stateJson: JSON.stringify(result.nextState.bonusState ?? null)
        }
      });
    });

    return this.buildPlayerSnapshot(currentUser.id);
  }
}
