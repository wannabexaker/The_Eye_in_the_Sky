import { listGameConfigProfiles } from "@eye/game-engine";
import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "./auth.crypto";

export const PRIMARY_GAME_KEY = "the-eye-in-the-sky";
export const ACTIVE_PROFILE_SETTING_KEY = "game:the-eye-in-the-sky:activeProfileId";

export async function ensureBaseData(prisma: PrismaClient) {
  const game = await prisma.game.upsert({
    where: { key: PRIMARY_GAME_KEY },
    update: {
      title: "The Eye in the Sky",
      isActive: true
    },
    create: {
      key: PRIMARY_GAME_KEY,
      title: "The Eye in the Sky",
      isActive: true
    }
  });

  for (const profile of listGameConfigProfiles()) {
    await prisma.gameMathProfile.upsert({
      where: { profileId: profile.id },
      update: {
        label: profile.label,
        version: profile.config.version,
        isLegacy: profile.isLegacy,
        targetRtp: profile.config.targetRtp,
        volatilityLabel: profile.config.volatility,
        configJson: JSON.stringify(profile.config),
        gameId: game.id
      },
      create: {
        gameId: game.id,
        profileId: profile.id,
        label: profile.label,
        version: profile.config.version,
        isLegacy: profile.isLegacy,
        targetRtp: profile.config.targetRtp,
        volatilityLabel: profile.config.volatility,
        configJson: JSON.stringify(profile.config)
      }
    });
  }

  await prisma.appSetting.upsert({
    where: { key: ACTIVE_PROFILE_SETTING_KEY },
    update: {},
    create: {
      key: ACTIVE_PROFILE_SETTING_KEY,
      value: "math_base_v2_0"
    }
  });

  // Seed default development users if credentials are provided
  // WARNING: These are temporary development credentials and should be replaced in production
  const adminSeedEmail = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const adminSeedPassword = process.env.ADMIN_SEED_PASSWORD?.trim();
  const playerSeedEmail = process.env.PLAYER_SEED_EMAIL?.trim().toLowerCase();
  const playerSeedPassword = process.env.PLAYER_SEED_PASSWORD?.trim();

  // Create/update admin user
  if (adminSeedEmail && adminSeedPassword) {
    const passwordHash = await hashPassword(adminSeedPassword);
    const adminUser = await prisma.user.upsert({
      where: { email: adminSeedEmail },
      update: {
        displayName: "Temple Operator",
        role: "admin",
        isActive: true,
        passwordHash
      },
      create: {
        email: adminSeedEmail,
        passwordHash,
        displayName: "Temple Operator",
        role: "admin",
        isActive: true,
        welcomeBonusClaimed: true
      }
    });

    await prisma.wallet.upsert({
      where: { userId: adminUser.id },
      update: {},
      create: {
        userId: adminUser.id,
        currencyCode: "EUR",
        balance: 0
      }
    });
  }

  // Create/update standard player user
  if (playerSeedEmail && playerSeedPassword) {
    const passwordHash = await hashPassword(playerSeedPassword);
    const playerUser = await prisma.user.upsert({
      where: { email: playerSeedEmail },
      update: {
        displayName: "Test Player",
        role: "player",
        isActive: true,
        passwordHash
      },
      create: {
        email: playerSeedEmail,
        passwordHash,
        displayName: "Test Player",
        role: "player",
        isActive: true,
        welcomeBonusClaimed: false
      }
    });

    await prisma.wallet.upsert({
      where: { userId: playerUser.id },
      update: {},
      create: {
        userId: playerUser.id,
        currencyCode: "EUR",
        balance: 100.0
      }
    });
  }
}
