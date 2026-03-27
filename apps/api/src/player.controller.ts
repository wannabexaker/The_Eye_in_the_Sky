import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import type { WalletMutationRequestDto } from "@eye/shared-types";
import { CurrentUser } from "./current-user.decorator";
import { SessionAuthGuard } from "./auth.guard";
import type { CurrentAuthUser } from "./auth.types";
import { PlayerService } from "./player.service";

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
  deposit(
    @CurrentUser() currentUser: CurrentAuthUser,
    @Body() body: WalletMutationRequestDto
  ) {
    return this.playerService.deposit(currentUser, body);
  }

  @Post("wallet/withdraw")
  withdraw(
    @CurrentUser() currentUser: CurrentAuthUser,
    @Body() body: WalletMutationRequestDto
  ) {
    return this.playerService.withdraw(currentUser, body);
  }

  @Post("rounds")
  persistRound(
    @CurrentUser() currentUser: CurrentAuthUser,
    @Body() body: { profileId?: string; result?: unknown }
  ) {
    return this.playerService.persistRound(currentUser, body as never);
  }
}
