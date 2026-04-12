import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import * as crypto from "crypto";

/**
 * Handles nonce/jti replay protection and issuance tracking.
 */
@Injectable()
export class AuthNonceReplayService {
  private readonly logger = new Logger(AuthNonceReplayService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Track a nonce/jti as issued for a provider.
   * Throws if already consumed.
   */
  async trackNonce(
    nonceOrJti: string,
    providerKey: string,
    expiresAtSec: number,
    requestHash?: string
  ): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(expiresAtSec * 1000);

    // Check if nonce already exists and has been consumed
    const existing = await this.prisma.authNonceReplay.findUnique({
      where: {
        nonceOrJti_providerKey: {
          nonceOrJti,
          providerKey
        }
      }
    });

    if (existing && existing.consumedAt) {
      this.logger.warn(
        `Replay attempt detected for nonce=${nonceOrJti}, provider=${providerKey}`
      );
      throw new BadRequestException("Nonce has already been used (replay detected)");
    }

    // Check if nonce has expired
    if (existing && existing.expiresAt < now) {
      this.logger.warn(
        `Expired nonce attempt for nonce=${nonceOrJti}, provider=${providerKey}`
      );
      throw new BadRequestException("Nonce has expired");
    }

    // Create or update based on whether it already exists
    if (existing) {
      await this.prisma.authNonceReplay.update({
        where: {
          nonceOrJti_providerKey: {
            nonceOrJti,
            providerKey
          }
        },
        data: {
          requestHash: requestHash || existing.requestHash,
          expiresAt: expiresAt > existing.expiresAt ? expiresAt : existing.expiresAt
        }
      });
    } else {
      await this.prisma.authNonceReplay.create({
        data: {
          nonceOrJti,
          providerKey,
          issuedAt: now,
          expiresAt,
          requestHash
        }
      });
    }
  }

  /**
   * Verify and consume a nonce/jti.
   * Throws if not found, expired, or already consumed.
   */
  async verifyAndConsumeNonce(
    nonceOrJti: string,
    providerKey: string,
    requestHash?: string
  ): Promise<void> {
    const now = new Date();

    const record = await this.prisma.authNonceReplay.findUnique({
      where: {
        nonceOrJti_providerKey: {
          nonceOrJti,
          providerKey
        }
      }
    });

    if (!record) {
      this.logger.warn(
        `Unknown nonce verification attempt: nonce=${nonceOrJti}, provider=${providerKey}`
      );
      throw new BadRequestException("Nonce not found or has expired");
    }

    if (record.consumedAt) {
      this.logger.warn(
        `Replay attempt detected on verification for nonce=${nonceOrJti}, provider=${providerKey}`
      );
      throw new BadRequestException("Nonce has already been used (replay detected)");
    }

    if (record.expiresAt < now) {
      this.logger.warn(
        `Expired nonce on verification: nonce=${nonceOrJti}, provider=${providerKey}`
      );
      throw new BadRequestException("Nonce has expired");
    }

    // Optional: verify request hash matches if provided
    if (requestHash && record.requestHash && record.requestHash !== requestHash) {
      this.logger.warn(
        `Request hash mismatch for nonce=${nonceOrJti}: expected=${record.requestHash}, got=${requestHash}`
      );
      throw new BadRequestException("Request signature verification failed");
    }

    // Mark as consumed
    await this.prisma.authNonceReplay.update({
      where: {
        nonceOrJti_providerKey: {
          nonceOrJti,
          providerKey
        }
      },
      data: {
        consumedAt: now
      }
    });
  }

  /**
   * Generate a fresh nonce for client use.
   */
  generateNonce(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  /**
   * Clean up expired nonces (should be called periodically).
   */
  async cleanupExpiredNonces(): Promise<number> {
    const result = await this.prisma.authNonceReplay.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    return result.count;
  }
}
