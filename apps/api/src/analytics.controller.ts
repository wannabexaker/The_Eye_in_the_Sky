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
import { AdminGuard } from "./auth.guard";
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
  @UseGuards(AdminGuard)
  async getSummary() {
    return this.analyticsService.getSummary();
  }

  @Get("dashboard")
  @UseGuards(AdminGuard)
  async getDashboard(@Query("limit") limit?: string) {
    const parsed = limit ? Number.parseInt(limit, 10) : 2000;
    const safeLimit = Number.isFinite(parsed) ? Math.max(200, Math.min(10000, parsed)) : 2000;
    return this.analyticsService.getDashboard(safeLimit);
  }

  @Get("rounds")
  @UseGuards(AdminGuard)
  async getRounds(@Query("limit") limit?: string) {
    const parsed = limit ? Number.parseInt(limit, 10) : 250;
    return this.analyticsService.listRounds(parsed);
  }

  @Delete("reset")
  @UseGuards(AdminGuard)
  async reset() {
    return this.analyticsService.reset();
  }
}
