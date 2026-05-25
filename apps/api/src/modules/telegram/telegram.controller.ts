import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { JwtPayload } from '../../common/auth/jwt-payload.type';
import { PrismaService } from '../../prisma/prisma.service';

interface LinkResponse {
  connected: boolean;
  code: string | null;
  url: string | null;
  botUsername: string | null;
}

function makeCode(): string {
  return randomBytes(8).toString('base64url').slice(0, 12);
}

@Controller('customers/:id/telegram-link')
@UseGuards(JwtAuthGuard)
export class TelegramLinkController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  async get(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<LinkResponse> {
    const customer = await this.findCustomer(user.storeId, id);
    return this.buildResponse(customer.telegramChatId, customer.telegramLinkCode);
  }

  @Post()
  async regenerate(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<LinkResponse> {
    const customer = await this.findCustomer(user.storeId, id);
    const code = makeCode();
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { telegramLinkCode: code },
    });
    return this.buildResponse(customer.telegramChatId, code);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<void> {
    const customer = await this.findCustomer(user.storeId, id);
    await this.prisma.customer.update({
      where: { id: customer.id },
      data: { telegramChatId: null, telegramLinkCode: null },
    });
  }

  private async findCustomer(storeId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, storeId },
      select: { id: true, telegramChatId: true, telegramLinkCode: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  private buildResponse(chatId: string | null, code: string | null): LinkResponse {
    const botUsername = this.config.get<string>('TELEGRAM_BOT_USERNAME') ?? null;
    const url =
      code && botUsername ? `https://t.me/${botUsername}?start=c_${code}` : null;
    return {
      connected: chatId !== null,
      code,
      url,
      botUsername,
    };
  }
}
