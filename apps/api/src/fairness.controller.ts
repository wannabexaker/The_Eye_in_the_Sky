/*
Purpose: provably-fair commitment endpoints (gated by PROVABLY_FAIR_ENABLED).
Layer: backend (api)
*/

import { Body, Controller, Get, NotFoundException, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { SessionAuthGuard } from "./auth.guard";
import { CurrentUser } from "./current-user.decorator";
import type { CurrentAuthUser } from "./auth.types";
import { FairnessService } from "./fairness.service";
import { isProvablyFairEnabled } from "./provably-fair";
import { parseOrBadRequest, validators } from "./validators/game.validators";

@UseGuards(SessionAuthGuard)
@Controller("player/fairness")
export class FairnessController {
  constructor(private readonly fairnessService: FairnessService) {}

  private assertEnabled() {
    if (!isProvablyFairEnabled()) {
      throw new NotFoundException({
        code: "PROVABLY_FAIR_DISABLED",
        message: "Provably-fair mode is not enabled."
      });
    }
  }

  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @Get()
  getCommitment(@CurrentUser() currentUser: CurrentAuthUser) {
    this.assertEnabled();
    return this.fairnessService.getCommitment(currentUser.id);
  }

  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post("client-seed")
  setClientSeed(
    @Body() body: { clientSeed?: string },
    @CurrentUser() currentUser: CurrentAuthUser
  ) {
    this.assertEnabled();
    const validated = parseOrBadRequest(validators.fairnessClientSeed, body);
    return this.fairnessService.setClientSeed(currentUser.id, validated.clientSeed);
  }

  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @Post("rotate")
  rotateServerSeed(@CurrentUser() currentUser: CurrentAuthUser) {
    this.assertEnabled();
    return this.fairnessService.rotateServerSeed(currentUser.id);
  }
}
