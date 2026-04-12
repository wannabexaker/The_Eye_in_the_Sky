-- ============================================================
-- The Eye in the Sky — SQL Server → PostgreSQL Migration
-- ============================================================
-- This migration creates the full schema as documented in schema.prisma.
-- Run ONCE on a fresh PostgreSQL database.
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create all tables
CREATE TABLE "User" (
    id TEXT NOT NULL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'player',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "welcomeBonusClaimed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "AuthSession" (
    id TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL UNIQUE,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "authSource" TEXT NOT NULL DEFAULT 'internal',
    "providerKey" TEXT,
    "externalSessionRef" TEXT,
    "lastValidatedAt" TIMESTAMP(3),
    "riskFlags" TEXT,
    CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
CREATE INDEX "AuthSession_authSource_idx" ON "AuthSession"("authSource");

CREATE TABLE "Wallet" (
    id TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL UNIQUE,
    "currencyCode" TEXT NOT NULL DEFAULT 'EUR',
    balance DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE "LedgerEntry" (
    id TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "roundId" TEXT,
    reason TEXT NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    "balanceAfter" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadataJson" TEXT,
    CONSTRAINT "LedgerEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "LedgerEntry_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"(id) ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE INDEX "LedgerEntry_walletId_createdAt_idx" ON "LedgerEntry"("walletId", "createdAt");
CREATE INDEX "LedgerEntry_reason_createdAt_idx" ON "LedgerEntry"(reason, "createdAt");

CREATE TABLE "Game" (
    id TEXT NOT NULL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "GameMathProfile" (
    id TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    version TEXT NOT NULL UNIQUE,
    "isLegacy" BOOLEAN NOT NULL DEFAULT false,
    "configJson" TEXT NOT NULL,
    "targetRtp" DOUBLE PRECISION NOT NULL,
    "volatilityLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GameMathProfile_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "GameMathProfile_gameId_idx" ON "GameMathProfile"("gameId");

CREATE TABLE "AppSetting" (
    key TEXT NOT NULL PRIMARY KEY,
    value VARCHAR(400) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE TABLE "GameSession" (
    id TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "activeProfileId" TEXT NOT NULL,
    "configVersion" TEXT NOT NULL,
    "stateJson" TEXT,
    "lastRoundId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    CONSTRAINT "GameSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "GameSession_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    UNIQUE ("userId", "gameId")
);

CREATE INDEX "GameSession_gameId_idx" ON "GameSession"("gameId");

CREATE TABLE "Round" (
    id TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "gameSessionId" TEXT,
    "profileId" TEXT NOT NULL,
    "configVersion" TEXT NOT NULL,
    "seedUsed" TEXT NOT NULL,
    mode TEXT NOT NULL,
    "chargedBet" DECIMAL(18,2) NOT NULL,
    bet DECIMAL(18,2) NOT NULL,
    "totalWin" DECIMAL(18,2) NOT NULL,
    "walletDelta" DECIMAL(18,2) NOT NULL,
    "initialBoardJson" TEXT,
    "resultJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Round_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "Round_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "Round_gameSessionId_fkey" FOREIGN KEY ("gameSessionId") REFERENCES "GameSession"(id) ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE INDEX "Round_userId_createdAt_idx" ON "Round"("userId", "createdAt");
CREATE INDEX "Round_gameId_createdAt_idx" ON "Round"("gameId", "createdAt");
CREATE INDEX "Round_gameSessionId_idx" ON "Round"("gameSessionId");

CREATE TABLE "BonusState" (
    id TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "roundId" TEXT,
    mode TEXT NOT NULL,
    "freeSpinsRemaining" INTEGER NOT NULL,
    "stickyMultiplier" INTEGER NOT NULL,
    "totalBonusWin" DECIMAL(18,2) NOT NULL,
    "betPerSpin" DECIMAL(18,2) NOT NULL,
    "initialBonusBudget" DECIMAL(18,2) NOT NULL,
    "remainingBonusBudget" DECIMAL(18,2) NOT NULL,
    "preBonusBet" DECIMAL(18,2) NOT NULL,
    "stateJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BonusState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "BonusState_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"(id) ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE INDEX "BonusState_userId_updatedAt_idx" ON "BonusState"("userId", "updatedAt");

CREATE TABLE "AdminAction" (
    id TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    payload TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "AdminAction_userId_createdAt_idx" ON "AdminAction"("userId", "createdAt");

CREATE TABLE "AuditLog" (
    id TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    payload TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt");

CREATE TABLE "ExternalIdentity" (
    id TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "externalUsername" TEXT,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExternalIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE NO ACTION,
    UNIQUE ("providerKey", "externalUserId")
);

CREATE INDEX "ExternalIdentity_userId_idx" ON "ExternalIdentity"("userId");
CREATE INDEX "ExternalIdentity_providerKey_idx" ON "ExternalIdentity"("providerKey");

CREATE TABLE "AuthNonceReplay" (
    id TEXT NOT NULL PRIMARY KEY,
    "nonceOrJti" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "requestHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("nonceOrJti", "providerKey")
);

CREATE INDEX "AuthNonceReplay_expiresAt_idx" ON "AuthNonceReplay"("expiresAt");
CREATE INDEX "AuthNonceReplay_providerKey_idx" ON "AuthNonceReplay"("providerKey");

CREATE TABLE "AnalyticsRound" (
    id TEXT NOT NULL PRIMARY KEY,
    "timestampMs" BIGINT NOT NULL,
    bet DECIMAL(18,2) NOT NULL,
    win DECIMAL(18,2) NOT NULL,
    net DECIMAL(18,2) NOT NULL,
    mode TEXT NOT NULL,
    cascades INTEGER NOT NULL,
    "bonusTriggered" BOOLEAN NOT NULL,
    multiplier DOUBLE PRECISION NOT NULL,
    "winMultiple" DOUBLE PRECISION NOT NULL,
    tier TEXT NOT NULL,
    "balanceAfter" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AnalyticsRound_timestampMs_idx" ON "AnalyticsRound"("timestampMs");
CREATE INDEX "AnalyticsRound_tier_idx" ON "AnalyticsRound"(tier);
CREATE INDEX "AnalyticsRound_createdAt_idx" ON "AnalyticsRound"("createdAt");
