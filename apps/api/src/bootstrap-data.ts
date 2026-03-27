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

  const adminSeedEmail = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const adminSeedPassword = process.env.ADMIN_SEED_PASSWORD?.trim();

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
}
