import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { GameConfigController } from "./game-config.controller";
import { GameConfigService } from "./game-config.service";

@Module({
  controllers: [HealthController, GameConfigController],
  providers: [GameConfigService]
})
export class AppModule {}
