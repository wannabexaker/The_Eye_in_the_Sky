/*
Purpose: provably-fair commit-reveal seed lifecycle per player.
Layer: backend (api)
Uses: provably-fair primitives + Prisma PlayerFairnessSeed.
*/

import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "./prisma.service";
import {
  deriveProvablyFairSeed,
  generateClientSeed,
  generateServerSeed,
  hashServerSeed
} from "./provably-fair";

export type FairnessCommitment = {
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  previousServerSeed: string | null;
  previousServerSeedHash: string | null;
};

export type ConsumedSpinSeed = {
  seed: number;
  clientSeed: string;
  serverSeedHash: string;
  nonce: number;
};

@Injectable()
export class FairnessService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureSeed(client: Prisma.TransactionClient, userId: string) {
    const existing = await client.playerFairnessSeed.findUnique({ where: { userId } });
    if (existing) {
      return existing;
    }

    const serverSeed = generateServerSeed();
    return client.playerFairnessSeed.create({
      data: {
        userId,
        serverSeed,
        serverSeedHash: hashServerSeed(serverSeed),
        clientSeed: generateClientSeed()
      }
    });
  }

  private toCommitment(seed: {
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
    previousServerSeed: string | null;
    previousServerSeedHash: string | null;
  }): FairnessCommitment {
    return {
      serverSeedHash: seed.serverSeedHash,
      clientSeed: seed.clientSeed,
      nonce: seed.nonce,
      previousServerSeed: seed.previousServerSeed,
      previousServerSeedHash: seed.previousServerSeedHash
    };
  }

  /** Public commitment for the player — never exposes the active serverSeed. */
  async getCommitment(userId: string): Promise<FairnessCommitment> {
    const seed = await this.ensureSeed(this.prisma, userId);
    return this.toCommitment(seed);
  }

  async setClientSeed(userId: string, clientSeed: string): Promise<FairnessCommitment> {
    await this.ensureSeed(this.prisma, userId);
    const seed = await this.prisma.playerFairnessSeed.update({
      where: { userId },
      data: { clientSeed: clientSeed.trim() }
    });
    return this.toCommitment(seed);
  }

  /**
   * Reveal the current serverSeed (so prior rounds can be verified), issue a
   * fresh serverSeed commitment, and reset the nonce.
   */
  async rotateServerSeed(
    userId: string
  ): Promise<FairnessCommitment & { revealedServerSeed: string }> {
    const current = await this.ensureSeed(this.prisma, userId);
    const nextServerSeed = generateServerSeed();
    const seed = await this.prisma.playerFairnessSeed.update({
      where: { userId },
      data: {
        serverSeed: nextServerSeed,
        serverSeedHash: hashServerSeed(nextServerSeed),
        nonce: 0,
        previousServerSeed: current.serverSeed,
        previousServerSeedHash: current.serverSeedHash
      }
    });

    return { ...this.toCommitment(seed), revealedServerSeed: current.serverSeed };
  }

  /**
   * Within an existing transaction: derive the deterministic spin seed from the
   * current commitment and advance the nonce. Returns the per-round commitment
   * to persist alongside the round.
   */
  async consumeSpinSeed(
    tx: Prisma.TransactionClient,
    userId: string
  ): Promise<ConsumedSpinSeed> {
    const seed = await this.ensureSeed(tx, userId);
    const usedNonce = seed.nonce;
    const derived = deriveProvablyFairSeed(seed.serverSeed, seed.clientSeed, usedNonce);

    await tx.playerFairnessSeed.update({
      where: { userId },
      data: { nonce: usedNonce + 1 }
    });

    return {
      seed: derived,
      clientSeed: seed.clientSeed,
      serverSeedHash: seed.serverSeedHash,
      nonce: usedNonce
    };
  }
}
