import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot } from 'grammy';
import { PrismaService } from '../../prisma/prisma.service';

const START_PAYLOAD_PREFIX_CUSTOMER = 'c_';
const START_PAYLOAD_PREFIX_OWNER = 'o_';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Bot | null = null;
  private starting: Promise<void> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Serverless hosts (Vercel) can't run long-polling — switch to webhook
    // mode separately if you need the bot there. For now we just no-op.
    if (process.env.VERCEL) {
      this.logger.warn('Telegram polling disabled on Vercel (serverless runtime).');
      return;
    }
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — bot will not start');
      return;
    }

    const bot = new Bot(token);
    this.bot = bot;

    bot.command('start', async (ctx) => {
      const payload = ctx.match?.toString().trim();
      const chatId = ctx.chat?.id;
      if (!chatId) return;

      if (!payload) {
        await ctx.reply(
          'Welcome to SavdoCRM. Open the link from your customer card to receive order updates.',
        );
        return;
      }

      if (payload.startsWith(START_PAYLOAD_PREFIX_CUSTOMER)) {
        const code = payload.slice(START_PAYLOAD_PREFIX_CUSTOMER.length);
        const customer = await this.prisma.customer.findUnique({
          where: { telegramLinkCode: code },
          include: { store: { select: { locale: true, name: true } } },
        });
        if (!customer) {
          await ctx.reply('❌ Invalid or expired link.');
          return;
        }
        await this.prisma.customer.update({
          where: { id: customer.id },
          data: {
            telegramChatId: String(chatId),
            telegramLinkCode: null,
          },
        });
        const greeting = greetLinked(customer.store.locale, customer.name, customer.store.name);
        await ctx.reply(greeting);
        return;
      }

      if (payload.startsWith(START_PAYLOAD_PREFIX_OWNER)) {
        const code = payload.slice(START_PAYLOAD_PREFIX_OWNER.length);
        const owner = await this.prisma.user.findUnique({
          where: { telegramLinkCode: code },
          include: { store: { select: { locale: true, name: true } } },
        });
        if (!owner) {
          await ctx.reply('❌ Invalid or expired link.');
          return;
        }
        await this.prisma.user.update({
          where: { id: owner.id },
          data: {
            telegramChatId: String(chatId),
            telegramLinkCode: null,
          },
        });
        const greeting = greetOwnerLinked(owner.store.locale, owner.name, owner.store.name);
        await ctx.reply(greeting);
        return;
      }

      await ctx.reply('❌ Invalid or expired link.');
    });

    bot.catch((err) => {
      this.logger.error('Telegram bot error', err.error as Error);
    });

    // Start polling in the background — don't block module init.
    this.starting = bot
      .start({
        drop_pending_updates: true,
        onStart: (info) => {
          this.logger.log(`Telegram bot @${info.username} started`);
        },
      })
      .catch((err) => {
        this.logger.error('Telegram bot failed to start', err);
      });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.bot) {
      await this.bot.stop();
      this.bot = null;
    }
  }

  isEnabled(): boolean {
    return this.bot !== null;
  }

  async sendMessage(chatId: string, text: string): Promise<boolean> {
    if (!this.bot) return false;
    try {
      await this.bot.api.sendMessage(chatId, text);
      return true;
    } catch (err) {
      this.logger.warn(`sendMessage to ${chatId} failed: ${(err as Error).message}`);
      return false;
    }
  }
}

function greetLinked(locale: string, customerName: string, storeName: string): string {
  if (locale === 'uz') {
    return `✓ Salom, ${customerName}! Endi siz "${storeName}" do'konidan buyurtmangiz holati haqida xabar olasiz.`;
  }
  return `✓ Здравствуйте, ${customerName}! Теперь вы будете получать уведомления о статусе ваших заказов от магазина «${storeName}».`;
}

function greetOwnerLinked(locale: string, name: string, storeName: string): string {
  if (locale === 'uz') {
    return `✓ Salom, ${name}! "${storeName}" do'koningiz uchun yangi buyurtmalar haqida xabarnomalar shu yerga keladi.`;
  }
  return `✓ Здравствуйте, ${name}! Уведомления о новых заказах магазина «${storeName}» теперь будут приходить сюда.`;
}
