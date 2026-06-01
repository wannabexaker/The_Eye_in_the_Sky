import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
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

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000;
const PASSWORD_RESET_CANDIDATE_LIMIT = 200;

const authError = (code: string, message: string, reason?: string) => ({
  code,
  message,
  ...(reason ? { reason } : {})
});

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  private setSessionCookie(response: any, request: RequestWithAuth, token: string, expiresAt: Date) {
    const cookieSecureOverride = process.env.COOKIE_SECURE === "true";

    response.cookie(AUTH_SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: cookieSecureOverride ? "none" : "lax",
      secure: isSecureRequest(request),
      expires: expiresAt,
      path: "/"
    });
  }

  private clearSessionCookie(response: any, request: RequestWithAuth) {
    const cookieSecureOverride = process.env.COOKIE_SECURE === "true";

    response.cookie(AUTH_SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: cookieSecureOverride ? "none" : "lax",
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
    const displayName = payload.displayName?.trim() ?? "";

    if (!email || !email.includes("@")) {
      throw new BadRequestException("Valid email is required.");
    }

    if (password.length < 8) {
      this.logger.warn("Register rejected: weak password");
      throw new BadRequestException(
        authError("WEAK_PASSWORD", "Password must be at least 8 characters.", "Min 8 characters.")
      );
    }

    if (!/^[\p{L}\p{N}_\s-]{2,50}$/u.test(displayName)) {
      this.logger.warn("Register rejected: invalid display name");
      throw new BadRequestException(
        authError("INVALID_DISPLAY_NAME", "Display name contains invalid characters.", "Use letters, numbers, spaces, underscores, or hyphens.")
      );
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      this.logger.warn("Register rejected: email already exists");
      throw new ConflictException(
        authError("EMAIL_TAKEN", "An account with this email already exists.")
      );
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
      this.logger.warn("Login failed: email not found or inactive");
      throw new NotFoundException(
        authError("EMAIL_NOT_FOUND", "No account with this email.")
      );
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      this.logger.warn(`Login failed for user ${user.id}: wrong password`);
      throw new UnauthorizedException(
        authError("WRONG_PASSWORD", "Wrong password. Please try again.")
      );
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

  async changePassword(
    currentUser: CurrentAuthUser,
    payload: { currentPassword: string; newPassword: string }
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: currentUser.id } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Authentication required.");
    }

    const validCurrentPassword = await verifyPassword(payload.currentPassword, user.passwordHash);
    if (!validCurrentPassword) {
      this.logger.warn(`Password change failed for user ${currentUser.id}: wrong current password`);
      throw new UnauthorizedException(
        authError("WRONG_PASSWORD", "Wrong password. Please try again.")
      );
    }

    const passwordHash = await hashPassword(payload.newPassword);
    await this.prisma.user.update({
      where: { id: currentUser.id },
      data: { passwordHash }
    });

    this.logger.log(`Password changed for user ${currentUser.id}; active sessions kept valid.`);
    return { ok: true };
  }

  async forgotPassword(payload: { email: string }) {
    const email = normalizeEmail(payload.email);
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      this.logger.warn("Password reset requested for non-existent or inactive email");
      return { ok: true };
    }

    const resetToken = createSessionToken();
    const tokenHash = await hashPassword(resetToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_MS);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.passwordResetToken.updateMany({
        where: {
          playerId: user.id,
          usedAt: null,
          expiresAt: { gt: now }
        },
        data: { usedAt: now }
      });

      await transaction.passwordResetToken.create({
        data: {
          playerId: user.id,
          tokenHash,
          expiresAt
        }
      });
    });

    this.logger.log(`Password reset token for ${email}: ${resetToken}`);

    return process.env.NODE_ENV === "production"
      ? { ok: true }
      : { ok: true, resetToken };
  }

  async resetPassword(payload: { token: string; newPassword: string }) {
    const now = new Date();
    const candidates = await this.prisma.passwordResetToken.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: now }
      },
      include: { player: true },
      orderBy: { createdAt: "desc" },
      take: PASSWORD_RESET_CANDIDATE_LIMIT
    });

    let matchedToken: (typeof candidates)[number] | null = null;
    for (const candidate of candidates) {
      if (await verifyPassword(payload.token, candidate.tokenHash)) {
        matchedToken = candidate;
        break;
      }
    }

    if (!matchedToken || !matchedToken.player.isActive) {
      this.logger.warn("Password reset failed: invalid, expired, or used token");
      throw new BadRequestException(
        authError("INVALID_RESET_TOKEN", "Reset token is invalid or expired.")
      );
    }

    const resetTokenRecord = matchedToken;
    const passwordHash = await hashPassword(payload.newPassword);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: resetTokenRecord.playerId },
        data: { passwordHash }
      });

      await transaction.passwordResetToken.update({
        where: { id: resetTokenRecord.id },
        data: { usedAt: now }
      });

      await transaction.authSession.deleteMany({
        where: { userId: resetTokenRecord.playerId }
      });
    });

    this.logger.log(`Password reset completed for user ${resetTokenRecord.playerId}; sessions invalidated.`);
    return { ok: true };
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
