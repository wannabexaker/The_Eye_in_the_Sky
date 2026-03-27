import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { GameConfigController } from "./game-config.controller";
import { GameConfigService } from "./game-config.service";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { AppController } from "./app.controller";
import { PrismaService } from "./prisma.service";
import { BootstrapService } from "./bootstrap.service";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { SessionAuthGuard, AdminGuard } from "./auth.guard";
import { PlayerController } from "./player.controller";
import { PlayerService } from "./player.service";

@Module({
  controllers: [
    AppController,
    HealthController,
    AuthController,
    PlayerController,
    GameConfigController,
    AnalyticsController
  ],
  providers: [
    PrismaService,
    BootstrapService,
    GameConfigService,
    AnalyticsService,
    AuthService,
    PlayerService,
    SessionAuthGuard,
    AdminGuard
  ]
})
export class AppModule {}
