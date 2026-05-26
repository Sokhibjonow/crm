import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS: in production set WEB_ORIGIN to the Vercel URL (or comma-separated list).
  // Empty/unset = reflect any origin (fine for local dev).
  const origins = (process.env.WEB_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length > 0 ? origins : true,
    credentials: true,
  });

  // Keep the prefix consistent with the Vercel handler — /api/health rather
  // than /health, so the same client URLs work in dev and prod.
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Railway / most PaaS providers inject PORT. Fall back to API_PORT for local dev.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');

  // eslint-disable-next-line no-console
  console.log(`API listening on :${port}`);
}

bootstrap();
