// Vercel serverless entrypoint. Boots NestJS once per cold start and reuses
// the express handler across warm invocations of the same Lambda instance.

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Express, type Request, type Response } from 'express';
import { AppModule } from '../src/app.module';

let cachedApp: Express | null = null;
let bootPromise: Promise<Express> | null = null;

async function bootstrap(): Promise<Express> {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    logger: ['error', 'warn', 'log'],
  });

  const origins = (process.env.WEB_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({
    origin: origins.length > 0 ? origins : true,
    credentials: true,
  });

  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.init();
  return expressApp;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  if (!cachedApp) {
    if (!bootPromise) bootPromise = bootstrap();
    cachedApp = await bootPromise;
  }
  cachedApp(req, res);
}

// Vercel: extend the default function timeout because cold-start + Prisma can
// blow past the 10s Hobby default on first request.
export const config = {
  maxDuration: 30,
};
