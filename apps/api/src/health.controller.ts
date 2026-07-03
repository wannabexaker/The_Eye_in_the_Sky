import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "./prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness: process is up and serving — no dependencies touched. */
  @Get("live")
  getLiveness() {
    return { status: "ok" };
  }

  /** Readiness: dependencies (database) are reachable; 200 only when ready. */
  @Get("ready")
  async getReadiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", database: "up" };
    } catch {
      // Non-200 so orchestrators pull the instance out of rotation.
      throw new ServiceUnavailableException({ status: "degraded", database: "down" });
    }
  }

  @Get()
  async getHealth() {
    let database: "up" | "down" = "down";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = "up";
    } catch {
      database = "down";
    }

    return {
      status: database === "up" ? "ok" : "degraded",
      service: "the-eye-in-the-sky-api",
      scope: "fake-money-prototype",
      database
    };
  }
}
