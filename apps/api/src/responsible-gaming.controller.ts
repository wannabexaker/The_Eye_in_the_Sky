import { Body, Controller, Get, Post, Put, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "./current-user.decorator";
import { SessionAuthGuard } from "./auth.guard";
import type { CurrentAuthUser } from "./auth.types";
import { ResponsibleGamingService } from "./responsible-gaming.service";
import { parseOrBadRequest, validators } from "./validators/game.validators";

@Controller("player/responsible-gaming")
@UseGuards(SessionAuthGuard)
export class ResponsibleGamingController {
  constructor(private readonly responsibleGamingService: ResponsibleGamingService) {}

  @Get()
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  getSettings(@CurrentUser() currentUser: CurrentAuthUser) {
    return this.responsibleGamingService.getSettings(currentUser.id);
  }

  @Put()
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  updateSettings(
    @CurrentUser() currentUser: CurrentAuthUser,
    @Body() body: unknown
  ) {
    const validatedBody = parseOrBadRequest(validators.responsibleGamingSettingsUpdate, body);
    return this.responsibleGamingService.updateSettings(currentUser.id, validatedBody);
  }

  @Post("cooloff")
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  setCooloff(
    @CurrentUser() currentUser: CurrentAuthUser,
    @Body() body: unknown
  ) {
    const validatedBody = parseOrBadRequest(validators.responsibleGamingCooloff, body);
    return this.responsibleGamingService.setCooloff(currentUser.id, validatedBody.durationHours);
  }

  @Post("self-exclude")
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  setSelfExclusion(
    @CurrentUser() currentUser: CurrentAuthUser,
    @Body() body: unknown
  ) {
    const validatedBody = parseOrBadRequest(validators.responsibleGamingSelfExclusion, body);
    return this.responsibleGamingService.setSelfExclusion(currentUser.id, validatedBody.durationHours);
  }
}
