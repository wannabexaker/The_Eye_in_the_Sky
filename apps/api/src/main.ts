import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3100"
    ],
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
  await app.listen(Number.isFinite(port) ? port : 3200);
}

void bootstrap();
