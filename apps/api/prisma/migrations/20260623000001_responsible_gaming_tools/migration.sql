CREATE TABLE "PlayerResponsibleGaming" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "depositLimitDaily" DECIMAL(18,2),
    "depositLimitWeekly" DECIMAL(18,2),
    "depositLimitMonthly" DECIMAL(18,2),
    "lossLimitDaily" DECIMAL(18,2),
    "lossLimitWeekly" DECIMAL(18,2),
    "lossLimitMonthly" DECIMAL(18,2),
    "sessionTimeLimitMinutes" INTEGER,
    "realityCheckIntervalMinutes" INTEGER,
    "selfExclusionUntil" TIMESTAMP(3),
    "cooloffUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerResponsibleGaming_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerResponsibleGaming_userId_key" ON "PlayerResponsibleGaming"("userId");
CREATE INDEX "PlayerResponsibleGaming_selfExclusionUntil_idx" ON "PlayerResponsibleGaming"("selfExclusionUntil");
CREATE INDEX "PlayerResponsibleGaming_cooloffUntil_idx" ON "PlayerResponsibleGaming"("cooloffUntil");

ALTER TABLE "PlayerResponsibleGaming"
ADD CONSTRAINT "PlayerResponsibleGaming_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
