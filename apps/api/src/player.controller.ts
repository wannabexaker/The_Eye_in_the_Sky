import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { WalletMutationRequestDto } from "@eye/shared-types";
import { CurrentUser } from "./current-user.decorator";
import { SessionAuthGuard } from "./auth.guard";
import type { CurrentAuthUser } from "./auth.types";
import { PlayerService } from "./player.service";
import { parseOrBadRequest, validators } from "./validators/game.validators";

@Controller("player")
@UseGuards(SessionAuthGuard)
export class PlayerController {
  constructor(private readonly playerService: PlayerService) {}

  @Get("bootstrap")
  getBootstrap(@CurrentUser() currentUser: CurrentAuthUser) {
    return this.playerService.getBootstrap(currentUser);
  }

  @Post("welcome-bonus/claim")
  claimWelcomeBonus(@CurrentUser() currentUser: CurrentAuthUser) {
    return this.playerService.claimWelcomeBonus(currentUser);
  }

  @Post("wallet/deposit")
  @Throttle({ default: { ttl: 60_000, limit: 30 } })
  deposit(
    @CurrentUser() currentUser: CurrentAuthUser,
    @Body() body: WalletMutationRequestDto
  ) {
    const validatedBody = parseOrBadRequest(validators.walletOperation, body);
    return this.playerService.deposit(currentUser, validatedBody);
  }

  @Post("wallet/withdraw")
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  withdraw(
    @CurrentUser() currentUser: CurrentAuthUser,
    @Body() body: WalletMutationRequestDto
  ) {
    const validatedBody = parseOrBadRequest(validators.walletOperation, body);
    return this.playerService.withdraw(currentUser, validatedBody);
  }

  @Post("rounds")
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  persistRound(
    @CurrentUser() currentUser: CurrentAuthUser,
    @Body() body: { profileId?: string; result?: unknown }
  ) {
    const validatedBody = parseOrBadRequest(validators.persistRound, body);
    return this.playerService.persistRound(currentUser, validatedBody as never);
  }

  /**
   * Server-authoritative provably-fair spin. Gated by PROVABLY_FAIR_ENABLED
   * (404 when disabled) — the legacy client-resolved /rounds path stays default.
   */
  @Post("spin")
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  resolveServerRound(
    @CurrentUser() currentUser: CurrentAuthUser,
    @Body() body: { bet?: number; profileId?: string }
  ) {
    const validatedBody = parseOrBadRequest(validators.serverSpin, body);
    return this.playerService.resolveServerRound(currentUser, validatedBody);
  }
}
