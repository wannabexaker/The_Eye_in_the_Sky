-- Provably-fair commit-reveal seed state (server-authoritative spins).
CREATE TABLE "PlayerFairnessSeed" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serverSeed" TEXT NOT NULL,
    "serverSeedHash" TEXT NOT NULL,
    "clientSeed" TEXT NOT NULL,
    "nonce" INTEGER NOT NULL DEFAULT 0,
    "previousServerSeed" TEXT,
    "previousServerSeedHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerFairnessSeed_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerFairnessSeed_userId_key" ON "PlayerFairnessSeed"("userId");

ALTER TABLE "PlayerFairnessSeed"
ADD CONSTRAINT "PlayerFairnessSeed_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Per-round seed commitment so revealed seeds can be verified against outcomes.
ALTER TABLE "Round" ADD COLUMN "clientSeed" TEXT;
ALTER TABLE "Round" ADD COLUMN "serverSeedHash" TEXT;
ALTER TABLE "Round" ADD COLUMN "nonce" INTEGER;
