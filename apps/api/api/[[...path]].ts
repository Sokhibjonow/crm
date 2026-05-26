// Vercel serverless entrypoint. Boots NestJS once per cold start and reuses
// the express handler across warm invocations of the same Lambda instance.

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { AppModule } from '../src/app.module';

let cachedApp: Express | null = null;
let bootPromise: Promise<Express> | null = null;

async function bootstrap(): Promise<Express> {
  const expressApp = express();

  // Explicit CORS handler — runs first so the OPTIONS preflight always
  // gets a 204 with the right headers, even on routes Nest hasn't
  // registered. Doing this here (instead of via Nest's enableCors or the
  // cors npm package) sidesteps a few issues observed in Vercel cold
  // starts where middleware ordering caused 4xx on preflight.
  const origins = (process.env.WEB_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  expressApp.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    const isAllowed =
      typeof origin === 'string' && (origins.length === 0 || origins.includes(origin));
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin!);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization',
      );
      res.setHeader('Access-Control-Max-Age', '86400');
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') {
      res.statusCode = isAllowed ? 204 : 403;
      res.end();
      return;
    }
    next();
  });

  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    logger: ['error', 'warn', 'log'],
  });

  app.setGlobalPrefix('api');
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

export const config = {
  maxDuration: 30,
};
