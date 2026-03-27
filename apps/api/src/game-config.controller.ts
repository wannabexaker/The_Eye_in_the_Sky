import type { GameMathProfileId } from "@eye/game-engine";
import { Controller, Get, Post, Body, BadRequestException } from "@nestjs/common";
import { GameConfigService, type GameConfigStateDto } from "./game-config.service";

@Controller("game-config")
export class GameConfigController {
  constructor(private readonly gameConfigService: GameConfigService) {}

  @Get()
  getActiveConfig(): GameConfigStateDto {
    return this.gameConfigService.getActiveConfig();
  }

  @Get("profiles")
  listProfiles() {
    return this.gameConfigService.listAvailableProfiles();
  }

  @Post("select")
  selectProfile(@Body() body: { profileId: string }): GameConfigStateDto {
    if (!body.profileId) {
      throw new BadRequestException("profileId is required");
    }

    const validProfiles: GameMathProfileId[] = [
      "legacy_v1_3",
      "math_base_v2_0",
      "constellation_simple_v0_1"
    ];
    if (!validProfiles.includes(body.profileId as GameMathProfileId)) {
      throw new BadRequestException(
        `Invalid profileId. Must be one of: ${validProfiles.join(", ")}`
      );
    }

    return this.gameConfigService.setActiveProfile(body.profileId as GameMathProfileId);
  }
}
