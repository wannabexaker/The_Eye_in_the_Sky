import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      // Fail fast with actionable guidance instead of a cryptic stack trace.
      this.logger.error(
        "Database connection failed. Is Postgres running and DATABASE_URL correct?\n" +
          "  Start the DB:  docker compose up -d --wait postgres\n" +
          "  Apply schema:  corepack pnpm --filter api prisma:migrate\n" +
          "  Seed data:     corepack pnpm --filter api prisma:seed"
      );
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
