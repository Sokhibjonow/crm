import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { JwtPayload } from '../../common/auth/jwt-payload.type';
import { PrismaService } from '../../prisma/prisma.service';

interface OwnerLinkResponse {
  connected: boolean;
  code: string | null;
  url: string | null;
  botUsername: string | null;
}

function makeCode(): string {
  return randomBytes(8).toString('base64url').slice(0, 12);
}

/**
 * Per-user Telegram link for staff (especially OWNERs) to receive new-order
 * DMs. Endpoint mounted under /api/auth/me/telegram-link.
 */
@Controller('auth/me/telegram-link')
@UseGuards(JwtAuthGuard)
export class OwnerTelegramLinkController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async get(@CurrentUser() user: JwtPayload): Promise<OwnerLinkResponse> {
    const me = await this.findMe(user.userId);
    return this.buildResponse(me.telegramChatId, me.telegramLinkCode);
  }

  @Post()
  async regenerate(@CurrentUser() user: JwtPayload): Promise<OwnerLinkResponse> {
    await this.findMe(user.userId);
    const code = makeCode();
    const updated = await this.prisma.user.update({
      where: { id: user.userId },
      data: { telegramLinkCode: code },
      select: { telegramChatId: true, telegramLinkCode: true },
    });
    return this.buildResponse(updated.telegramChatId, updated.telegramLinkCode);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(@CurrentUser() user: JwtPayload): Promise<void> {
    await this.findMe(user.userId);
    await this.prisma.user.update({
      where: { id: user.userId },
      data: { telegramChatId: null, telegramLinkCode: null },
    });
  }

  private async findMe(userId: string) {
    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, telegramChatId: true, telegramLinkCode: true },
    });
    if (!me) throw new NotFoundException('User not found');
    return me;
  }

  private buildResponse(chatId: string | null, code: string | null): OwnerLinkResponse {
    const botUsername = this.config.get<string>('TELEGRAM_BOT_USERNAME') ?? null;
    const url =
      code && botUsername ? `https://t.me/${botUsername}?start=o_${code}` : null;
    return {
      connected: chatId !== null,
      code,
      url,
      botUsername,
    };
  }
}
