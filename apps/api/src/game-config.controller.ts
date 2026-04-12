import type { GameMathProfileId } from "@eye/game-engine";
import { Controller, Get, Post, Body, BadRequestException, UseGuards } from "@nestjs/common";
import { AdminGuard } from "./auth.guard";
import { CurrentUser } from "./current-user.decorator";
import type { CurrentAuthUser } from "./auth.types";
import { GameConfigService, type GameConfigStateDto } from "./game-config.service";
import { parseOrBadRequest, validators } from "./validators/game.validators";

@Controller("game-config")
export class GameConfigController {
  constructor(private readonly gameConfigService: GameConfigService) {}

  @Get()
  getActiveConfig(): Promise<GameConfigStateDto> {
    return this.gameConfigService.getActiveConfig();
  }

  @Get("profiles")
  listProfiles() {
    return this.gameConfigService.listAvailableProfiles();
  }

  @Post("select")
  @UseGuards(AdminGuard)
  selectProfile(
    @Body() body: { profileId: string },
    @CurrentUser() currentUser: CurrentAuthUser
  ): Promise<GameConfigStateDto> {
    const validatedBody = parseOrBadRequest(validators.profileSelect, body);

    const validProfiles: GameMathProfileId[] = [
      "legacy_v1_3",
      "math_base_v2_0",
      "constellation_simple_v0_1"
    ];
    if (!validProfiles.includes(validatedBody.profileId as GameMathProfileId)) {
      throw new BadRequestException(
        `Invalid profileId. Must be one of: ${validProfiles.join(", ")}`
      );
    }

    return this.gameConfigService.setActiveProfile(validatedBody.profileId as GameMathProfileId, currentUser.id);
  }
}
