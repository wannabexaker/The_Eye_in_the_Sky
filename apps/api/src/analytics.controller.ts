import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query
} from "@nestjs/common";
import { AnalyticsService, type RoundAnalyticsEntry } from "./analytics.service";

type IngestPayload = {
  entries: RoundAnalyticsEntry[];
};

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post("ingest")
  async ingest(@Body() body: IngestPayload) {
    const entries = body?.entries;
    if (!Array.isArray(entries)) {
      throw new BadRequestException("entries array is required");
    }

    return this.analyticsService.ingest(entries);
  }

  @Get("summary")
  async getSummary() {
    return this.analyticsService.getSummary();
  }

  @Get("dashboard")
  async getDashboard(@Query("limit") limit?: string) {
    const parsed = limit ? Number.parseInt(limit, 10) : 2000;
    const safeLimit = Number.isFinite(parsed) ? Math.max(200, Math.min(10000, parsed)) : 2000;
    return this.analyticsService.getDashboard(safeLimit);
  }

  @Get("rounds")
  async getRounds(@Query("limit") limit?: string) {
    const parsed = limit ? Number.parseInt(limit, 10) : 250;
    return this.analyticsService.listRounds(parsed);
  }

  @Delete("reset")
  async reset() {
    return this.analyticsService.reset();
  }
}