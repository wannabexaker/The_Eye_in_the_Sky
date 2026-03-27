import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { HealthController } from "./health.controller";
import { GameConfigController } from "./game-config.controller";
import { GameConfigService } from "./game-config.service";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { AppController } from "./app.controller";
import { SecurityGuard } from "./security.guard";

@Module({
  controllers: [AppController, HealthController, GameConfigController, AnalyticsController],
  providers: [
    GameConfigService,
    AnalyticsService,
    {
      provide: APP_GUARD,
      useClass: SecurityGuard
    }
  ]
})
export class AppModule {}
