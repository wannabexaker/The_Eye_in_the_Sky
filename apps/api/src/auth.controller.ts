import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { AuthService } from "./auth.service";
import type { RequestWithAuth } from "./auth.types";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  register(
    @Body() body: { email?: string; password?: string; displayName?: string },
    @Req() request: RequestWithAuth,
    @Res({ passthrough: true }) response: any
  ) {
    return this.authService.registerPlayer(body, request, response);
  }

  @Post("login")
  login(
    @Body() body: { email?: string; password?: string },
    @Req() request: RequestWithAuth,
    @Res({ passthrough: true }) response: any
  ) {
    return this.authService.login(body, request, response);
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
}
