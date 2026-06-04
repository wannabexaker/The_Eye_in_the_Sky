import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import { AdminGuard } from "./auth.guard";
import {
  AdminSimulationService,
  type AdminSimulationRequest
} from "./admin-simulation.service";
import { parseOrBadRequest } from "./validators/game.validators";

const simulationRequestSchema = z.object({
  profileId: z.enum(["legacy_v1_3", "math_base_v2_0", "constellation_simple_v0_1"]),
  spins: z.number().int().min(1).max(1_000_000),
  bet: z.number().finite().positive().max(100_000),
  seed: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  winMultiplier: z.number().finite().positive().max(10_000).optional()
});

@Controller("admin/simulate")
@UseGuards(AdminGuard)
export class AdminSimulationController {
  constructor(private readonly simulationService: AdminSimulationService) {}

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 6 } })
  startSimulation(@Body() body: unknown) {
    const request = parseOrBadRequest(
      simulationRequestSchema,
      body
    ) as AdminSimulationRequest;
    return this.simulationService.startSimulation(request);
  }

  @Get(":jobId")
  @Throttle({ default: { ttl: 60_000, limit: 180 } })
  getSimulation(@Param("jobId") jobId: string) {
    return this.simulationService.getJob(jobId);
  }
}
