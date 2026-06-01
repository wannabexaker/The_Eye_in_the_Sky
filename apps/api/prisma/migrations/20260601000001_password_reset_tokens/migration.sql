CREATE TABLE "PasswordResetToken" (
    id TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE INDEX "PasswordResetToken_playerId_idx" ON "PasswordResetToken"("playerId");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
CREATE INDEX "PasswordResetToken_usedAt_idx" ON "PasswordResetToken"("usedAt");
