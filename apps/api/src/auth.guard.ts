import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { AuthModeService } from "./auth-mode.service";
import type { RequestWithAuth } from "./auth.types";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const user = await this.authService.resolveCurrentUser(request);

    if (!user) {
      throw new UnauthorizedException("Authentication required.");
    }

    request.authUser = user;
    return true;
  }
}

/**
 * Allows the request only when internal authentication (login/register) is
 * permitted by the current auth mode. Throws 403 in EXTERNAL_ONLY mode.
 */
@Injectable()
export class InternalAuthPolicyGuard implements CanActivate {
  constructor(private readonly authModeService: AuthModeService) {}

  async canActivate(_context: ExecutionContext): Promise<boolean> {
    const allowed = await this.authModeService.isInternalAuthAllowed();
    if (!allowed) {
      throw new ForbiddenException(
        "Internal authentication is disabled. This deployment requires external platform login."
      );
    }
    return true;
  }
}

/**
 * Allows the request only when external platform token exchange is permitted
 * by the current auth mode. Throws 403 in INTERNAL_ONLY mode.
 */
@Injectable()
export class ExternalAuthPolicyGuard implements CanActivate {
  constructor(private readonly authModeService: AuthModeService) {}

  async canActivate(_context: ExecutionContext): Promise<boolean> {
    const allowed = await this.authModeService.isExternalAuthAllowed();
    if (!allowed) {
      throw new ForbiddenException(
        "External platform authentication is disabled. This deployment uses internal login only."
      );
    }
    return true;
  }
}

@Injectable()
export class AdminGuard extends SessionAuthGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowed = await super.canActivate(context);
    if (!allowed) {
      return false;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    if (request.authUser?.role !== "admin") {
      throw new ForbiddenException("Admin access required.");
    }

    return true;
  }
}
