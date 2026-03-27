import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { AuthService } from "./auth.service";
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
