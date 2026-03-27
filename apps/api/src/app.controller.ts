import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  getInfo() {
    return {
      service: "the-eye-in-the-sky-api",
      status: "ok",
      scope: "fake-money-prototype",
      docs: "/swagger",
      health: "/health",
      endpoints: {
        auth: "/auth",
        playerBootstrap: "/player/bootstrap",
        gameConfig: "/game-config",
        analyticsIngest: "/analytics/ingest"
      },
      note: "Use authenticated cookie sessions for player/admin flows. x-dev-api-key is no longer the primary access path."
    };
  }
}
