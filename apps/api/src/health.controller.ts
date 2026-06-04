import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "./prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

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
