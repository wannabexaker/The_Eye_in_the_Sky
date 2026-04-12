import { Injectable, BadRequestException, Logger, UnauthorizedException } from "@nestjs/common";
import { AuthModeService } from "./auth-mode.service";
import * as jwt from "jsonwebtoken";
import JwksClient from "jwks-rsa";

/**
 * Validated platform token with extracted claims.
 */
export interface ValidatedPlatformToken {
  sub: string;
  email: string;
  username?: string;
  aud: string;
  iss: string;
  exp: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  metadata?: Record<string, any>;
}

/**
 * Handles platform token validation (JWT, JWKS, introspection).
 */
@Injectable()
export class PlatformExchangeValidatorService {
  private readonly logger = new Logger(PlatformExchangeValidatorService.name);
  private jwksClients = new Map<string, ReturnType<typeof JwksClient>>();

  constructor(private readonly authModeService: AuthModeService) {}

  /**
   * Validate and decode platform assertion (JWT token).
   */
  async validatePlatformAssertion(
    platformAssertion: string,
    nonce: string,
    timestamp: number,
    providerKey: string
  ): Promise<ValidatedPlatformToken> {
    const config = await this.authModeService.getConfig();

    if (!config.platformIssuer || !config.platformAudience) {
      throw new BadRequestException("Platform integration not configured");
    }

    // Decode without verification first to check headers/claims
    let decoded: any;
    try {
      decoded = jwt.decode(platformAssertion, { complete: true });
      if (!decoded) {
        throw new Error("Invalid token format");
      }
    } catch (err: any) {
      this.logger.error(`Failed to decode token: ${err?.message}`);
      throw new UnauthorizedException("Invalid platform assertion format");
    }

    const { header, payload, signature } = decoded;

    // Verify signature using JWKS if available
    if (config.jwksUrl) {
      await this.verifyJwtWithJwks(platformAssertion, header, payload, config.jwksUrl);
    } else {
      this.logger.warn("No JWKS URL configured; skipping signature verification");
    }

    // Validate standard claims
    this.validateTokenClaims(payload, config.platformIssuer, config.platformAudience, config.allowedClockSkewSec);

    // Extract validated token
    const validatedToken: ValidatedPlatformToken = {
      sub: payload.sub,
      email: payload.email,
      username: payload.username || payload.preferred_username,
      aud: payload.aud,
      iss: payload.iss,
      exp: payload.exp,
      nbf: payload.nbf,
      iat: payload.iat,
      jti: payload.jti,
      metadata: payload.metadata || payload.claims || {}
    };

    return validatedToken;
  }

  /**
   * Verify JWT signature using JWKS.
   */
  private async verifyJwtWithJwks(
    token: string,
    header: any,
    payload: any,
    jwksUrl: string
  ): Promise<void> {
    try {
      let client = this.jwksClients.get(jwksUrl);
      if (!client) {
        client = JwksClient({
          jwksUri: jwksUrl,
          cache: true,
          cacheMaxAge: 600000 // 10 min
        });
        this.jwksClients.set(jwksUrl, client);
      }

      const signingKey = await client!.getSigningKey(header.kid);
      const publicKey = signingKey.getPublicKey();

      jwt.verify(token, publicKey,{
        algorithms: ["RS256", "RS384", "RS512"],
        issuer: payload.iss,
        audience: payload.aud
      });
    } catch (err: any) {
      this.logger.error(`JWT verification failed: ${err?.message}`);
      throw new UnauthorizedException(`Token verification failed: ${err?.message}`);
    }
  }

  /**
   * Validate standard JWT claims.
   */
  private validateTokenClaims(
    payload: any,
    expectedIssuer: string,
    expectedAudience: string,
    allowedClockSkewSec: number
  ): void {
    const now = Math.floor(Date.now() / 1000);
    const skew = allowedClockSkewSec || 0;

    // Check issuer
    if (payload.iss !== expectedIssuer) {
      throw new UnauthorizedException(
        `Invalid issuer: expected=${expectedIssuer}, got=${payload.iss}`
      );
    }

    // Check audience (can be string or array)
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!audiences.includes(expectedAudience)) {
      throw new UnauthorizedException(
        `Invalid audience: expected=${expectedAudience}, got=${JSON.stringify(audiences)}`
      );
    }

    // Check not-before
    if (payload.nbf && now < payload.nbf - skew) {
      throw new UnauthorizedException(
        `Token not yet valid (nbf=${payload.nbf}, now=${now}, skew=${skew})`
      );
    }

    // Check expiration
    if (payload.exp && now > payload.exp + skew) {
      throw new UnauthorizedException(
        `Token has expired (exp=${payload.exp}, now=${now}, skew=${skew})`
      );
    }

    // Require at least one of sub/email
    if (!payload.sub && !payload.email) {
      throw new BadRequestException("Token missing required claims (sub or email)");
    }
  }

  /**
   * Extract provider key from token issuer (domain-based).
   * Example: https://auth.example.com -> "example"
   */
  extractProviderKeyFromIssuer(issuer: string): string {
    try {
      const url = new URL(issuer);
      const hostname = url.hostname;
      const parts = hostname.split(".");
      // For *.example.com, return "example"; for auth.example.com, return "example"
      return parts[parts.length - 2] || "default";
    } catch {
      return "default";
    }
  }
}
