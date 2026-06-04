import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { HealthController } from "./health.controller";
import { GameConfigController } from "./game-config.controller";
import { GameConfigService } from "./game-config.service";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { AdminSimulationController } from "./admin-simulation.controller";
import { AdminSimulationService } from "./admin-simulation.service";
import { AppController } from "./app.controller";
import { PrismaService } from "./prisma.service";
import { BootstrapService } from "./bootstrap.service";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { AuthModeService } from "./auth-mode.service";
import { PlatformExchangeValidatorService } from "./platform-exchange-validator.service";
import { AuthNonceReplayService } from "./auth-nonce-replay.service";
import { SessionAuthGuard, AdminGuard, InternalAuthPolicyGuard, ExternalAuthPolicyGuard } from "./auth.guard";
import { PlayerController } from "./player.controller";
import { PlayerService } from "./player.service";

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60_000,
          limit: 120
        }
      ]
    })
  ],
  controllers: [
    AppController,
    HealthController,
    AuthController,
    PlayerController,
    GameConfigController,
    AnalyticsController,
    AdminSimulationController
  ],
  providers: [
    PrismaService,
    BootstrapService,
    GameConfigService,
    AnalyticsService,
    AdminSimulationService,
    AuthService,
    AuthModeService,
    PlatformExchangeValidatorService,
    AuthNonceReplayService,
    PlayerService,
    SessionAuthGuard,
    AdminGuard,
    InternalAuthPolicyGuard,
    ExternalAuthPolicyGuard,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}
