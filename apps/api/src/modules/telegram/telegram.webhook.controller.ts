import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@savdo/db';
import type { Update } from 'grammy/types';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { TelegramService } from './telegram.service';

/**
 * Webhook receiver for Telegram in serverless mode.
 *
 * Telegram POSTs every incoming update to this URL. We authenticate by
 * comparing the `X-Telegram-Bot-Api-Secret-Token` header to the value we
 * registered with setWebhook — this is Telegram's recommended way to keep
 * randos from spamming the endpoint.
 *
 * The admin endpoints (`/setup`) let an OWNER (re)register the webhook URL
 * from inside the app without needing curl.
 */
@Controller('telegram/webhook')
export class TelegramWebhookController {
  private readonly logger = new Logger(TelegramWebhookController.name);

  constructor(
    private readonly telegram: TelegramService,
    private readonly config: ConfigService,
  ) {}

  /** Telegram → us. Public; protected only by the secret-token header. */
  @Post()
  @HttpCode(HttpStatus.OK)
  async receive(
    @Body() update: Update,
    @Headers('x-telegram-bot-api-secret-token') headerSecret?: string,
  ): Promise<{ ok: boolean }> {
    const expected = this.config.get<string>('TELEGRAM_WEBHOOK_SECRET');
    if (expected && headerSecret !== expected) {
      // Don't 401 — Telegram will retry forever. Just log and ack.
      this.logger.warn('Webhook called with bad secret token; ignoring.');
      return { ok: true };
    }

    if (!update || typeof update !== 'object') {
      throw new BadRequestException('Invalid update payload');
    }

    const accepted = await this.telegram.handleUpdate(update);
    if (!accepted) {
      this.logger.warn('Webhook received but bot is not running.');
    }
    return { ok: true };
  }

  /** Inspect what Telegram thinks the current webhook is. */
  @Get('setup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  async info() {
    const info = await this.telegram.getWebhookInfo();
    if (!info) throw new ServiceUnavailableException('Bot is not running');
    return info;
  }

  /**
   * Register / refresh the webhook URL with Telegram. Pass `{ url }` in the
   * body to override the URL otherwise read from `TELEGRAM_WEBHOOK_URL`.
   */
  @Post('setup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  async setup(@Body() body: { url?: string }) {
    const url = (body?.url ?? this.config.get<string>('TELEGRAM_WEBHOOK_URL') ?? '').trim();
    if (!url) {
      throw new BadRequestException(
        'Pass { url } in the request body or set TELEGRAM_WEBHOOK_URL.',
      );
    }
    if (!/^https:\/\//.test(url)) {
      throw new BadRequestException('Webhook URL must use https://');
    }
    const secret = this.config.get<string>('TELEGRAM_WEBHOOK_SECRET') ?? undefined;
    try {
      await this.telegram.setWebhook(url, secret);
    } catch (err) {
      throw new ServiceUnavailableException((err as Error).message);
    }
    return { ok: true, url };
  }

  @Delete('setup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async teardown(): Promise<void> {
    try {
      await this.telegram.deleteWebhook();
    } catch (err) {
      throw new ServiceUnavailableException((err as Error).message);
    }
  }
}
