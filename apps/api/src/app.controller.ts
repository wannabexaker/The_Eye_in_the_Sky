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
        gameConfig: "/game-config",
        analyticsIngest: "/analytics/ingest"
      },
      note: "Use localhost or x-dev-api-key for secured endpoints when calling from outside loopback."
    };
  }
}
