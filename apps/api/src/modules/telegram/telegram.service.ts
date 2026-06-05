import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot } from 'grammy';
import type { Update } from 'grammy/types';
import { PrismaService } from '../../prisma/prisma.service';

const START_PAYLOAD_PREFIX_CUSTOMER = 'c_';
const START_PAYLOAD_PREFIX_OWNER = 'o_';

type Mode = 'polling' | 'webhook' | 'off';

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Bot | null = null;
  private mode: Mode = 'off';
  private starting: Promise<void> | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn('TELEGRAM_BOT_TOKEN not set — bot will not start');
      return;
    }

    // Serverless hosts (Vercel) can't long-poll. Detect those and run in
    // webhook mode instead — the bot is still constructed (so we can
    // sendMessage and handle updates) but no background loop runs.
    const wantsWebhook =
      process.env.VERCEL === '1' ||
      process.env.TELEGRAM_BOT_MODE === 'webhook';

    const bot = new Bot(token);
    this.bot = bot;
    this.registerHandlers(bot);

    bot.catch((err) => {
      this.logger.error('Telegram bot error', err.error as Error);
    });

    if (wantsWebhook) {
      this.mode = 'webhook';
      // init() fetches bot info so handleUpdate works without a poll loop.
      try {
        await bot.init();
        this.logger.log(
          `Telegram bot @${bot.botInfo.username} ready (webhook mode).`,
        );
      } catch (err) {
        this.logger.error('Telegram bot.init() failed', err as Error);
        this.bot = null;
        this.mode = 'off';
      }
      return;
    }

    this.mode = 'polling';
    // Start polling in the background — don't block module init.
    this.starting = bot
      .start({
        drop_pending_updates: true,
        onStart: (info) => {
          this.logger.log(`Telegram bot @${info.username} started (polling).`);
        },
      })
      .catch((err) => {
        this.logger.error('Telegram bot failed to start', err);
      });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.bot && this.mode === 'polling') {
      await this.bot.stop();
    }
    this.bot = null;
    this.mode = 'off';
  }

  isEnabled(): boolean {
    return this.bot !== null;
  }

  getMode(): Mode {
    return this.mode;
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

  /**
   * Pump a single update through the bot's middleware. Called by the webhook
   * controller. Returns true if the update was accepted, false if the bot is
   * not running.
   */
  async handleUpdate(update: Update): Promise<boolean> {
    if (!this.bot) return false;
    try {
      await this.bot.handleUpdate(update);
      return true;
    } catch (err) {
      this.logger.warn(`handleUpdate failed: ${(err as Error).message}`);
      return false;
    }
  }

  /**
   * Register or refresh the Telegram webhook so updates POST to `url`.
   * `secretToken` (if set) is sent back in the X-Telegram-Bot-Api-Secret-Token
   * header on every webhook request — verify it in the controller.
   */
  async setWebhook(url: string, secretToken?: string): Promise<void> {
    if (!this.bot) throw new Error('Bot is not initialised');
    await this.bot.api.setWebhook(url, {
      drop_pending_updates: true,
      secret_token: secretToken || undefined,
      allowed_updates: ['message', 'callback_query'],
    });
  }

  async deleteWebhook(): Promise<void> {
    if (!this.bot) throw new Error('Bot is not initialised');
    await this.bot.api.deleteWebhook({ drop_pending_updates: true });
  }

  async getWebhookInfo(): Promise<{
    url: string;
    hasCustomCertificate: boolean;
    pendingUpdateCount: number;
    lastErrorMessage?: string;
    lastErrorDate?: number;
  } | null> {
    if (!this.bot) return null;
    const info = await this.bot.api.getWebhookInfo();
    return {
      url: info.url ?? '',
      hasCustomCertificate: info.has_custom_certificate,
      pendingUpdateCount: info.pending_update_count,
      lastErrorMessage: info.last_error_message,
      lastErrorDate: info.last_error_date,
    };
  }

  private registerHandlers(bot: Bot): void {
    bot.command('start', async (ctx) => {
      const payload = ctx.match?.toString().trim();
      const chatId = ctx.chat?.id;
      if (!chatId) return;

      if (!payload) {
        await ctx.reply(
          'Welcome to SavdoCRM. Open the link from your customer card or your profile to receive order updates.',
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
        await ctx.reply(
          greetCustomer(customer.store.locale, customer.name, customer.store.name),
        );
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
        await ctx.reply(
          greetOwner(owner.store.locale, owner.name, owner.store.name),
        );
        return;
      }

      await ctx.reply('❌ Invalid or expired link.');
    });
  }
}

function greetCustomer(locale: string, customerName: string, storeName: string): string {
  if (locale === 'uz') {
    return `✓ Salom, ${customerName}! Endi siz "${storeName}" do'konidan buyurtmangiz holati haqida xabar olasiz.`;
  }
  return `✓ Здравствуйте, ${customerName}! Теперь вы будете получать уведомления о статусе ваших заказов от магазина «${storeName}».`;
}

function greetOwner(locale: string, name: string, storeName: string): string {
  if (locale === 'uz') {
    return `✓ Salom, ${name}! "${storeName}" do'koningiz uchun yangi buyurtmalar haqida xabarnomalar shu yerga keladi.`;
  }
  return `✓ Здравствуйте, ${name}! Уведомления о новых заказах магазина «${storeName}» теперь будут приходить сюда.`;
}
