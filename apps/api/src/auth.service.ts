import {
  BadRequestException,
  Injectable,
  HttpStatus
} from "@nestjs/common";
import type { AuthSessionDto, AuthUserDto } from "@eye/shared-types";
import {
  createPasswordResetToken,
  createSessionToken,
  hashPassword,
  hashPasswordResetToken,
  hashSessionToken,
  verifyPassword
} from "./auth.crypto";
import { authError } from "./auth.errors";
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

const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 30;

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
      throw authError(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Validation failed", {
        email: "Valid email is required."
      });
    }

    if (password.length < 8) {
      throw authError(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Validation failed", {
        password: "Password must be at least 8 characters."
      });
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw authError(
        HttpStatus.BAD_REQUEST,
        "EMAIL_ALREADY_REGISTERED",
        "A user with this email already exists.",
        { email: "A user with this email already exists." }
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
      const fieldErrors: Record<string, string> = {};
      if (!email) {
        fieldErrors.email = "Email is required.";
      }
      if (!password) {
        fieldErrors.password = "Password is required.";
      }

      throw authError(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "Validation failed", {
        ...fieldErrors
      });
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw authError(HttpStatus.NOT_FOUND, "EMAIL_NOT_FOUND", "No account exists for this email.", {
        email: "No account exists for this email."
      });
    }

    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
      throw authError(HttpStatus.UNAUTHORIZED, "WRONG_PASSWORD", "Wrong password.", {
        password: "Wrong password."
      });
    }

    return this.createSessionForUser(user, request, response);
  }

  async changePassword(
    payload: { currentPassword?: string; newPassword?: string },
    currentUser: CurrentAuthUser
  ) {
    const currentPassword = payload.currentPassword?.trim() ?? "";
    const newPassword = payload.newPassword?.trim() ?? "";
    const user = await this.prisma.user.findUnique({ where: { id: currentUser.id } });

    if (!user || !user.isActive) {
      throw authError(HttpStatus.NOT_FOUND, "EMAIL_NOT_FOUND", "Player account was not found.");
    }

    const validCurrent = await verifyPassword(currentPassword, user.passwordHash);
    if (!validCurrent) {
      throw authError(HttpStatus.UNAUTHORIZED, "WRONG_PASSWORD", "Current password is wrong.", {
        currentPassword: "Current password is wrong."
      });
    }

    const reusesPassword = await verifyPassword(newPassword, user.passwordHash);
    if (reusesPassword) {
      throw authError(HttpStatus.BAD_REQUEST, "PASSWORD_REUSE", "New password must differ from the current password.", {
        newPassword: "New password must differ from the current password."
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(newPassword) }
    });

    // Existing sessions intentionally remain valid after an in-session password change.
    return { ok: true };
  }

  async forgotPassword(payload: { email?: string }) {
    const email = normalizeEmail(payload.email ?? "");
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      return { ok: true };
    }

    const resetToken = createPasswordResetToken();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashPasswordResetToken(resetToken),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS)
      }
    });

    return {
      ok: true,
      ...(process.env.NODE_ENV !== "production" ? { resetToken } : {})
    };
  }

  async resetPassword(payload: { token?: string; newPassword?: string }) {
    const token = payload.token?.trim() ?? "";
    const newPassword = payload.newPassword?.trim() ?? "";
    const tokenHash = hashPasswordResetToken(token);
    const resetRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (!resetRecord || resetRecord.usedAt || !resetRecord.user.isActive) {
      throw authError(HttpStatus.BAD_REQUEST, "INVALID_RESET_TOKEN", "Reset token is invalid.", {
        token: "Reset token is invalid."
      });
    }

    if (resetRecord.expiresAt.getTime() <= Date.now()) {
      throw authError(HttpStatus.BAD_REQUEST, "RESET_TOKEN_EXPIRED", "Reset token has expired.", {
        token: "Reset token has expired."
      });
    }

    const reusesPassword = await verifyPassword(newPassword, resetRecord.user.passwordHash);
    if (reusesPassword) {
      throw authError(HttpStatus.BAD_REQUEST, "PASSWORD_REUSE", "New password must differ from the current password.", {
        newPassword: "New password must differ from the current password."
      });
    }

    await this.prisma.$transaction(async (transaction) => {
      const markUsed = await transaction.passwordResetToken.updateMany({
        where: { id: resetRecord.id, usedAt: null },
        data: { usedAt: new Date() }
      });

      if (markUsed.count !== 1) {
        throw authError(HttpStatus.BAD_REQUEST, "INVALID_RESET_TOKEN", "Reset token is invalid.", {
          token: "Reset token is invalid."
        });
      }

      await transaction.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: await hashPassword(newPassword) }
      });

      await transaction.passwordResetToken.updateMany({
        where: { userId: resetRecord.userId, usedAt: null },
        data: { usedAt: new Date() }
      });

      await transaction.authSession.deleteMany({
        where: { userId: resetRecord.userId }
      });
    });

    return { ok: true };
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
