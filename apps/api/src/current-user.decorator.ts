import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { CurrentAuthUser, RequestWithAuth } from "./auth.types";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentAuthUser | undefined => {
    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    return request.authUser;
  }
);
