import { PrismaClient } from "@prisma/client";
import { ensureBaseData } from "../src/bootstrap-data";

const prisma = new PrismaClient();

async function main() {
  await ensureBaseData(prisma);
}

main()
  .catch((error) => {
    console.error("[seed] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
