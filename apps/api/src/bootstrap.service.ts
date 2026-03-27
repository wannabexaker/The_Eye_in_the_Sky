import { Injectable, OnModuleInit } from "@nestjs/common";
import { ensureBaseData } from "./bootstrap-data";
import { PrismaService } from "./prisma.service";

@Injectable()
export class BootstrapService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await ensureBaseData(this.prisma);
  }
}
