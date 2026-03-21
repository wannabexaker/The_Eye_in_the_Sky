import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { GameConfigController } from "./game-config.controller";
import { GameConfigService } from "./game-config.service";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";

@Module({
  controllers: [HealthController, GameConfigController, AnalyticsController],
  providers: [GameConfigService, AnalyticsService]
})
export class AppModule {}
