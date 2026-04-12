import {
  BadRequestException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import type { AuthSessionDto, AuthUserDto } from "@eye/shared-types";
import { createSessionToken, hashPassword, hashSessionToken, verifyPassword } from "./auth.crypto";
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_TTL_MS,
  getRequestIpAddress,
  getRequestSessionToken,
  isSecureRequest,
  normalizeEmail
} from "./auth.helpers";
import type { CurrentAuthUser, RequestWithAuth } from "./auth.types";
import { PrismaService } from "./prisma.service";
import type { ValidatedPlatformToken } from "./platform-exchange-validator.service";

const mapUser = (user: {
  id: string;
  email: string;
  displayName: string;
  role: string;
}): AuthUserDto => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  role: user.role === "admin" ? "admin" : "player"
});

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private setSessionCookie(response: any, request: RequestWithAuth, token: string, expiresAt: Date) {
    response.cookie(AUTH_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureRequest(request),
      expires: expiresAt,
      path: "/"
    });
  }

  private clearSessionCookie(response: any, request: RequestWithAuth) {
    response.cookie(AUTH_SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: isSecureRequest(request),
      expires: new Date(0),
      path: "/"
    });
  }

  async registerPlayer(
    payload: { email?: string; password?: string; displayName?: string },
    request: RequestWithAuth,
    response: any
  ): Promise<AuthSessionDto> {
    const email = normalizeEmail(payload.email ?? "");
    const password = payload.password?.trim() ?? "";
    const displayName = payload.displayName?.trim() || "Temple Initiate";

    if (!email || !email.includes("@")) {
      throw new BadRequestException("Valid email is required.");
    }

    if (password.length < 8) {
      throw new BadRequestException("Password must be at least 8 characters.");
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestException("A user with this email already exists.");
    }

    const passwordHash = await hashPassword(password);
    const user = await this.prisma.$transaction(async (transaction) => {
      const createdUser = await transaction.user.create({
        data: {
          email,
          passwordHash,
          displayName,
          role: "player",
          isActive: true,
          welcomeBonusClaimed: false
        }
      });

      await transaction.wallet.create({
        data: {
          userId: createdUser.id,
          currencyCode: "EUR",
          balance: 0
        }
      });

      return createdUser;
    });

    return this.createSessionForUser(user, request, response);
  }

  async login(
    payload: { email?: string; password?: string },
    request: RequestWithAuth,
    response: any
  ): Promise<AuthSessionDto> {
    const email = normalizeEmail(payload.email ?? "");
    const password = payload.password?.trim() ?? "";

    if (!email || !password) {
      throw new BadRequestException("Email and password are required.");
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException("Invalid credentials.");
    }

    return this.createSessionForUser(user, request, response);
  }

  async logout(request: RequestWithAuth, response: any) {
    const sessionToken = getRequestSessionToken(request);
    if (sessionToken) {
      await this.prisma.authSession.deleteMany({
        where: { tokenHash: hashSessionToken(sessionToken) }
      });
    }

    this.clearSessionCookie(response, request);
    return { ok: true };
  }

  async getCurrentSession(request: RequestWithAuth): Promise<AuthSessionDto> {
    const user = await this.resolveCurrentUser(request);
    return {
      authenticated: Boolean(user),
      user: user
        ? {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role
          }
        : null
    };
  }

  async resolveCurrentUser(request: RequestWithAuth): Promise<CurrentAuthUser | null> {
    const sessionToken = getRequestSessionToken(request);
    if (!sessionToken) {
      return null;
    }

    const session = await this.prisma.authSession.findUnique({
      where: { tokenHash: hashSessionToken(sessionToken) },
      include: { user: true }
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt.getTime() <= Date.now() || !session.user.isActive) {
      await this.prisma.authSession.deleteMany({ where: { id: session.id } });
      return null;
    }

    await this.prisma.authSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() }
    });

    return {
      id: session.user.id,
      email: session.user.email,
      displayName: session.user.displayName,
      role: session.user.role === "admin" ? "admin" : "player",
      sessionId: session.id
    };
  }

  private async createSessionForUser(
    user: { id: string; email: string; displayName: string; role: string },
    request: RequestWithAuth,
    response: any,
    authSource: "internal" | "external" = "internal",
    authMetadata?: { providerKey?: string; externalSessionRef?: string }
  ): Promise<AuthSessionDto> {
    const sessionToken = createSessionToken();
    const expiresAt = new Date(Date.now() + AUTH_SESSION_TTL_MS);

    await this.prisma.authSession.create({
      data: {
        userId: user.id,
        tokenHash: hashSessionToken(sessionToken),
        expiresAt,
        userAgent: typeof request.headers?.["user-agent"] === "string" ? request.headers["user-agent"] : null,
        ipAddress: getRequestIpAddress(request),
        authSource,
        providerKey: authMetadata?.providerKey,
        externalSessionRef: authMetadata?.externalSessionRef
      }
    });

    this.setSessionCookie(response, request, sessionToken, expiresAt);

    return {
      authenticated: true,
      user: mapUser(user)
    };
  }

  /**
   * Handle external platform token exchange.
   * Validates token, maps or provisions user, creates session.
   */
  async exchangePlatformToken(
    validatedToken: ValidatedPlatformToken,
    providerKey: string,
    request: RequestWithAuth,
    response: any
  ): Promise<AuthSessionDto> {
    const externalUserId = validatedToken.sub;
    const email = validatedToken.email;
    const displayName = validatedToken.username || email?.split("@")[0] || "Platform User";

    if (!externalUserId) {
      throw new BadRequestException("Token missing required subject (sub) claim");
    }

    // Try to resolve existing external identity
    const existingIdentity = await this.prisma.externalIdentity.findUnique({
      where: {
        providerKey_externalUserId: {
          providerKey,
          externalUserId
        }
      },
      include: { user: true }
    });

    let user: any;

    if (existingIdentity) {
      // Use existing user mapped to this external identity
      user = existingIdentity.user;
    } else {
      // Provision new user (or find by email if possible)
      if (email) {
        const emailUser = await this.prisma.user.findUnique({ where: { email } });
        if (emailUser) {
          user = emailUser;
        }
      }

      if (!user) {
        // Create new user
        user = await this.prisma.$transaction(async (transaction) => {
          const newUser = await transaction.user.create({
            data: {
              email: email || `external_${externalUserId}@platform.local`,
              passwordHash: "", // External users have no password
              displayName,
              role: "player",
              isActive: true
            }
          });

          await transaction.wallet.create({
            data: {
              userId: newUser.id,
              currencyCode: "EUR",
              balance: 0
            }
          });

          return newUser;
        });
      }

      // Create external identity mapping
      await this.prisma.externalIdentity.create({
        data: {
          userId: user.id,
          providerKey,
          externalUserId,
          externalUsername: validatedToken.username,
          metadataJson: JSON.stringify(validatedToken.metadata || {})
        }
      });
    }

    // Create session with external auth metadata
    return this.createSessionForUser(user, request, response, "external", {
      providerKey,
      externalSessionRef: validatedToken.jti
    });
  }
}
