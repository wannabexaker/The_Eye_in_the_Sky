import { Body, Controller, Get, Post, Patch, Req, Res, BadRequestException, Logger, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { parseOrBadRequest, validators } from "./validators/game.validators";
import { AuthModeService } from "./auth-mode.service";
import { PlatformExchangeValidatorService } from "./platform-exchange-validator.service";
import { AuthNonceReplayService } from "./auth-nonce-replay.service";
import { AdminGuard, ExternalAuthPolicyGuard, InternalAuthPolicyGuard, SessionAuthGuard } from "./auth.guard";
import { CurrentUser } from "./current-user.decorator";
import { assertTurnstile } from "./turnstile";
import type { RequestWithAuth, PlatformExchangeRequest, AuthMode } from "./auth.types";
import type { CurrentAuthUser } from "./auth.types";

const getValidationDetails = (issues: Array<{ path: readonly PropertyKey[]; message: string }>) =>
  issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    message: issue.message
  }));

const getFieldErrors = (issues: Array<{ path: readonly PropertyKey[]; message: string }>) =>
  issues.reduce<Record<string, string>>((accumulator, issue) => {
    const path = issue.path.join(".") || "form";
    if (!accumulator[path]) {
      accumulator[path] = issue.message;
    }
    return accumulator;
  }, {});

const parseRegisterOrBadRequest = (body: unknown) => {
  const result = validators.authRegister.safeParse(body);
  if (result.success) {
    return result.data;
  }

  const details = getValidationDetails(result.error.issues);
  const fieldErrors = getFieldErrors(result.error.issues);
  const hasPasswordIssue = result.error.issues.some((issue) => issue.path.join(".") === "password");
  const hasDisplayNameIssue = result.error.issues.some((issue) => issue.path.join(".") === "displayName");

  if (hasPasswordIssue) {
    throw new BadRequestException({
      code: "WEAK_PASSWORD",
      message: "Password must be at least 8 characters.",
      reason: "Min 8 characters.",
      fieldErrors,
      details
    });
  }

  if (hasDisplayNameIssue) {
    throw new BadRequestException({
      code: "INVALID_DISPLAY_NAME",
      message: "Display name contains invalid characters.",
      reason: "Use letters, numbers, spaces, underscores, or hyphens.",
      fieldErrors,
      details
    });
  }

  throw new BadRequestException({
    code: "VALIDATION_FAILED",
    message: "Validation failed",
    fieldErrors,
    details
  });
};

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly authModeService: AuthModeService,
    private readonly platformValidator: PlatformExchangeValidatorService,
    private readonly nonceReplay: AuthNonceReplayService
  ) {}

  @UseGuards(InternalAuthPolicyGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post("register")
  async register(
    @Body() body: { email?: string; password?: string; displayName?: string; turnstileToken?: string },
    @Req() request: RequestWithAuth,
    @Res({ passthrough: true }) response: any
  ) {
    const validatedBody = parseRegisterOrBadRequest(body);
    // Edge spam defense: when Turnstile is configured, registration requires a
    // valid challenge token. No-op when TURNSTILE_SECRET_KEY is unset.
    await assertTurnstile(body.turnstileToken);
    return this.authService.registerPlayer(validatedBody, request, response);
  }

  @UseGuards(InternalAuthPolicyGuard)
  @Throttle({ default: { ttl: 60_000, limit: 15 } })
  @Post("login")
  login(
    @Body() body: { email?: string; password?: string },
    @Req() request: RequestWithAuth,
    @Res({ passthrough: true }) response: any
  ) {
    const validatedBody = parseOrBadRequest(validators.authLogin, body);
    return this.authService.login(validatedBody, request, response);
  }

  @UseGuards(SessionAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("change-password")
  changePassword(
    @Body() body: { currentPassword?: string; newPassword?: string },
    @CurrentUser() currentUser: CurrentAuthUser
  ) {
    const validatedBody = parseOrBadRequest(validators.authChangePassword, body);
    return this.authService.changePassword(validatedBody, currentUser);
  }

  @UseGuards(InternalAuthPolicyGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("forgot-password")
  forgotPassword(@Body() body: { email?: string }) {
    const validatedBody = parseOrBadRequest(validators.authForgotPassword, body);
    return this.authService.forgotPassword(validatedBody);
  }

  @UseGuards(InternalAuthPolicyGuard)
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post("reset-password")
  resetPassword(@Body() body: { token?: string; newPassword?: string }) {
    const validatedBody = parseOrBadRequest(validators.authResetPassword, body);
    return this.authService.resetPassword(validatedBody);
  }

  @Post("logout")
  logout(
    @Req() request: RequestWithAuth,
    @Res({ passthrough: true }) response: any
  ) {
    return this.authService.logout(request, response);
  }

  @Get("me")
  getMe(@Req() request: RequestWithAuth) {
    return this.authService.getCurrentSession(request);
  }

  /**
   * Get current auth mode and public integration config.
   */
  @Get("mode")
  async getMode() {
    return this.authModeService.getPublicConfig();
  }

  /**
   * Platform token exchange endpoint.
   * Accepts signed platform assertion, validates, and creates session.
   */
  @UseGuards(ExternalAuthPolicyGuard)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post("platform/exchange")
  async exchangePlatformToken(
    @Body() body: PlatformExchangeRequest,
    @Req() request: RequestWithAuth,
    @Res({ passthrough: true }) response: any
  ) {
    const validatedBody = parseOrBadRequest(validators.authPlatformExchange, body);

    // Get config to validate
    const config = await this.authModeService.getConfig();
    if (!config.platformIssuer) {
      throw new BadRequestException("Platform integration not configured");
    }

    const providerKey = this.platformValidator.extractProviderKeyFromIssuer(
      config.platformIssuer
    );

    try {
      // Validate nonce isn't already used
      await this.nonceReplay.verifyAndConsumeNonce(validatedBody.nonce, providerKey);

      // Validate platform assertion
      const validatedToken = await this.platformValidator.validatePlatformAssertion(
        validatedBody.platformAssertion,
        validatedBody.nonce,
        validatedBody.timestamp,
        providerKey
      );

      // Verify jti (if present) for additional replay protection
      if (validatedToken.jti) {
        const jtiExpiry = validatedToken.exp;
        await this.nonceReplay.verifyAndConsumeNonce(
          validatedToken.jti,
          providerKey,
          JSON.stringify(validatedBody)
        );
      }

      // Exchange for session
      const sessionDto = await this.authService.exchangePlatformToken(
        validatedToken,
        providerKey,
        request,
        response
      );

      this.logger.log(
        `Platform exchange successful for external user ${validatedToken.sub} with provider ${providerKey}`
      );

      return sessionDto;
    } catch (err: any) {
      this.logger.warn(
        `Platform exchange failed: ${err?.message} (nonce=${validatedBody.nonce}, provider=${providerKey})`
      );

      // Audit security event
      // This would go to AuditLog in production

      throw err;
    }
  }

  /**
   * Admin: Get current auth mode configuration (public config only).
   */
  @Get("admin/mode")
  @UseGuards(AdminGuard)
  async getAuthModeAdmin() {
    return this.authModeService.getPublicConfig();
  }

  /**
   * Admin: Update auth mode configuration.
   */
  @Patch("admin/mode")
  @UseGuards(AdminGuard)
  async updateAuthMode(
    @Body() body: Partial<{ mode: AuthMode; platformIssuer?: string; platformAudience?: string; allowedClockSkewSec?: number; fallbackEnabled?: boolean; nonceTtlSec?: number }>,
    @CurrentUser() currentUser: CurrentAuthUser
  ) {
    const validatedBody = parseOrBadRequest(validators.authModePatch, body);

    const updates = {
      mode: validatedBody.mode as AuthMode,
      platformIssuer: validatedBody.platformIssuer,
      platformAudience: validatedBody.platformAudience,
      allowedClockSkewSec: validatedBody.allowedClockSkewSec,
      fallbackEnabled: validatedBody.fallbackEnabled,
      nonceTtlSec: validatedBody.nonceTtlSec
    };

    const result = await this.authModeService.updateConfig(updates, currentUser.id);

    this.logger.log(
      `Auth mode updated by admin ${currentUser.email}: mode=${updates.mode}`
    );

    return result;
  }
}
