import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseErrorFilter } from "./db-error.filter";

const loadLocalEnv = () => {
  const candidates = [".env", ".env.development", "apps/api/.env", "apps/api/.env.development"];

  for (const candidate of candidates) {
    const absolutePath = resolve(process.cwd(), candidate);

    if (existsSync(absolutePath)) {
      process.loadEnvFile(absolutePath);
    }
  }
};

loadLocalEnv();

const isAllowedOrigin = (origin: string | undefined) => {
  if (!origin) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname;

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return true;
    }

    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true;
    }

    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true;
    }

    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true;
    }

    if (
      parsed.protocol === "https:" &&
      (hostname === "olamov.com" || hostname === "eye.olamov.com")
    ) {
      return true;
    }

    const extraOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    return extraOrigins.includes(origin);
  } catch {
    return false;
  }
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  app.useGlobalFilters(new DatabaseErrorFilter());

  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin ?? "unknown"} is not allowed by CORS.`));
    },
    credentials: true
  });

  const config = new DocumentBuilder()
    .setTitle("The Eye in the Sky API")
    .setDescription("Fake-money prototype API")
    .setVersion("0.1.0")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("swagger", app, document);

  const port = Number(process.env.PORT ?? 3200);
  const safePort = Number.isFinite(port) ? port : 3200;
  await app.listen(safePort);

  const baseUrl = `http://localhost:${safePort}`;
  console.log(`[api] running on ${baseUrl}`);
  console.log(`[api] docs: ${baseUrl}/swagger`);
  console.log(`[api] health: ${baseUrl}/health`);
}

void bootstrap();
