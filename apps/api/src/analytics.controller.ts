import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AdminGuard } from "./auth.guard";
import { AnalyticsService, type RoundAnalyticsEntry } from "./analytics.service";
import { parseOrBadRequest, validators } from "./validators/game.validators";

type IngestPayload = {
  entries: RoundAnalyticsEntry[];
};

type AnalyticsVariantFilter = "all" | "2.0" | "simple" | "other";

const parseVariantFilter = (variant?: string): AnalyticsVariantFilter => {
  if (variant === "2.0" || variant === "simple" || variant === "other") {
    return variant;
  }

  return "all";
};

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post("ingest")
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  async ingest(@Body() body: IngestPayload) {
    const validatedBody = parseOrBadRequest(validators.analyticsIngest, body);
    return this.analyticsService.ingest(validatedBody.entries);
  }

  @Get("summary")
  @UseGuards(AdminGuard)
  async getSummary(@Query("variant") variant?: string) {
    return this.analyticsService.getSummary(parseVariantFilter(variant));
  }

  @Get("dashboard")
  @UseGuards(AdminGuard)
  async getDashboard(@Query("limit") limit?: string, @Query("variant") variant?: string) {
    const validatedQuery = parseOrBadRequest(validators.analyticsQuery, { limit, variant });
    const parsed = validatedQuery.limit ? Number.parseInt(validatedQuery.limit, 10) : 2000;
    const safeLimit = Number.isFinite(parsed) ? Math.max(200, Math.min(10000, parsed)) : 2000;
    return this.analyticsService.getDashboard(safeLimit, parseVariantFilter(validatedQuery.variant));
  }

  @Get("rounds")
  @UseGuards(AdminGuard)
  async getRounds(@Query("limit") limit?: string, @Query("variant") variant?: string) {
    const validatedQuery = parseOrBadRequest(validators.analyticsQuery, { limit, variant });
    const parsed = validatedQuery.limit ? Number.parseInt(validatedQuery.limit, 10) : 250;
    return this.analyticsService.listRounds(parsed, parseVariantFilter(validatedQuery.variant));
  }

  @Delete("reset")
  @UseGuards(AdminGuard)
  async reset() {
    return this.analyticsService.reset();
  }
}
