import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";

type RequestLike = {
  path?: string;
  url?: string;
  ip?: string;
  socket?: { remoteAddress?: string };
  headers?: Record<string, string | string[] | undefined>;
};

const DEV_API_KEY_HEADER = "x-dev-api-key";

const isLoopbackAddress = (ip: string | undefined): boolean => {
  if (!ip) {
    return false;
  }

  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "::ffff:127.0.0.1"
  );
};

const getHeaderValue = (
  headers: Record<string, string | string[] | undefined> | undefined,
  headerName: string
): string | null => {
  const value = headers?.[headerName];
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value[0] ?? null;
  }

  return null;
};

@Injectable()
export class SecurityGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const path = request.path ?? request.url ?? "";

    if (path.startsWith("/health") || path.startsWith("/swagger")) {
      return true;
    }

    const requestIp = request.ip ?? request.socket?.remoteAddress;
    if (isLoopbackAddress(requestIp)) {
      return true;
    }

    const expectedApiKey = process.env.API_DEV_KEY?.trim();
    const providedApiKey = getHeaderValue(request.headers, DEV_API_KEY_HEADER)?.trim();

    if (expectedApiKey && providedApiKey && providedApiKey === expectedApiKey) {
      return true;
    }

    throw new UnauthorizedException(
      "Unauthorized request. Use localhost or provide a valid x-dev-api-key header."
    );
  }
}
