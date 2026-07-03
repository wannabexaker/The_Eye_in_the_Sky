/*
Purpose: Prometheus scrape endpoint.
Layer: backend (api)
Gated by MetricsService.isEnabled() — 404 when disabled so the endpoint's
existence is not advertised on hardened deployments.
*/

import { Controller, Get, NotFoundException, Res } from "@nestjs/common";
import { MetricsService } from "./metrics.service";

// Minimal structural response type — avoids a direct express type dependency.
type ResponseLike = {
  setHeader: (name: string, value: string) => void;
  send: (body: string) => void;
};

@Controller("metrics")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  async getMetrics(@Res() response: ResponseLike) {
    if (!this.metricsService.isEnabled()) {
      throw new NotFoundException();
    }

    response.setHeader("Content-Type", this.metricsService.contentType());
    response.send(await this.metricsService.metrics());
  }
}
