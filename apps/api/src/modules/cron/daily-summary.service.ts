import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus, Prisma, Role } from '@savdo/db';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';

const DAY_MS = 24 * 60 * 60 * 1000;

interface StoreSummary {
  storeId: string;
  storeName: string;
  locale: string;
  ownerChatIds: string[];
  orderCount: number;
  revenue: Prisma.Decimal;
  topProductName: string | null;
  topProductQty: number;
  lowStockCount: number;
}

/**
 * Daily-summary copy. Two locales; {0} = revenue, {1} = order count,
 * {2} = top product line, {3} = low-stock line.
 */
const TEMPLATES: Record<string, string> = {
  ru:
    '📊 Сводка за вчера\n' +
    '\n' +
    '💵 Выручка: {0}\n' +
    '🧾 Заказов: {1}\n' +
    '{2}' +
    '{3}',
  uz:
    '📊 Kechagi hisobot\n' +
    '\n' +
    '💵 Tushum: {0}\n' +
    '🧾 Buyurtmalar: {1}\n' +
    '{2}' +
    '{3}',
};

const TOP_PRODUCT_LINE: Record<string, string> = {
  ru: '🔥 Лидер: {0} ({1} шт)\n',
  uz: '🔥 Lider: {0} ({1} dona)\n',
};

const LOW_STOCK_LINE: Record<string, string> = {
  ru: '⚠️ Заканчиваются: {0} товар(ов)\n',
  uz: '⚠️ Tugab qolayotgan: {0} ta mahsulot\n',
};

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function format(template: string, ...args: string[]): string {
  return template.replace(/\{(\d+)\}/g, (_, i) => args[Number(i)] ?? '');
}

function formatMoney(amount: Prisma.Decimal, locale: string): string {
  // Match the web's formatter: thousands separator, no decimals for UZS.
  const num = Number(amount.toString());
  return num.toLocaleString(locale === 'uz' ? 'uz-Latn-UZ' : 'ru-RU', {
    maximumFractionDigits: 0,
  });
}

@Injectable()
export class DailySummaryService {
  private readonly logger = new Logger(DailySummaryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  /**
   * Build per-store summaries for "yesterday" (UTC) and DM all linked owners.
   * Returns counters for the cron caller to log.
   */
  async runYesterday(): Promise<{ storesProcessed: number; messagesSent: number; messagesFailed: number }> {
    // Pull every store that has at least one OWNER with a linked Telegram —
    // no point computing a summary nobody will read.
    const stores = await this.prisma.store.findMany({
      where: {
        users: {
          some: {
            role: Role.OWNER,
            isActive: true,
            telegramChatId: { not: null },
          },
        },
      },
      select: {
        id: true,
        name: true,
        locale: true,
        users: {
          where: {
            role: Role.OWNER,
            isActive: true,
            telegramChatId: { not: null },
          },
          select: { telegramChatId: true },
        },
      },
    });

    let sent = 0;
    let failed = 0;

    for (const store of stores) {
      const summary = await this.buildSummary(store);
      const ok = await this.deliver(summary);
      sent += ok.sent;
      failed += ok.failed;
    }

    return { storesProcessed: stores.length, messagesSent: sent, messagesFailed: failed };
  }

  private async buildSummary(store: {
    id: string;
    name: string;
    locale: string;
    users: { telegramChatId: string | null }[];
  }): Promise<StoreSummary> {
    const todayStart = startOfUtcDay(new Date());
    const dayStart = new Date(todayStart.getTime() - DAY_MS);
    const dayEnd = todayStart;

    const [orderAgg, topProductGroups, lowStockCount] = await this.prisma.$transaction([
      this.prisma.order.aggregate({
        where: {
          storeId: store.id,
          createdAt: { gte: dayStart, lt: dayEnd },
          status: { not: OrderStatus.CANCELLED },
        },
        _count: { _all: true },
        _sum: { total: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            storeId: store.id,
            createdAt: { gte: dayStart, lt: dayEnd },
            status: { not: OrderStatus.CANCELLED },
          },
        },
        _sum: { qty: true },
        orderBy: { _sum: { qty: 'desc' } },
        take: 1,
      }),
      this.prisma.product.count({
        where: {
          storeId: store.id,
          isActive: true,
          lowStockThreshold: { gt: 0 },
          stock: { lte: this.prisma.product.fields.lowStockThreshold },
        },
      }),
    ]);

    let topProductName: string | null = null;
    let topProductQty = 0;
    if (topProductGroups.length > 0) {
      const top = topProductGroups[0]!;
      const product = await this.prisma.product.findUnique({
        where: { id: top.productId },
        select: { name: true },
      });
      topProductName = product?.name ?? null;
      topProductQty = top._sum?.qty ?? 0;
    }

    return {
      storeId: store.id,
      storeName: store.name,
      locale: store.locale,
      ownerChatIds: store.users
        .map((u) => u.telegramChatId)
        .filter((id): id is string => id !== null),
      orderCount: orderAgg._count._all,
      revenue: orderAgg._sum.total ?? new Prisma.Decimal(0),
      topProductName,
      topProductQty,
      lowStockCount,
    };
  }

  private async deliver(summary: StoreSummary): Promise<{ sent: number; failed: number }> {
    const locale = TEMPLATES[summary.locale] ? summary.locale : 'ru';

    const topLine =
      summary.topProductName !== null
        ? format(TOP_PRODUCT_LINE[locale]!, summary.topProductName, String(summary.topProductQty))
        : '';
    const lowLine =
      summary.lowStockCount > 0
        ? format(LOW_STOCK_LINE[locale]!, String(summary.lowStockCount))
        : '';

    const text = format(
      TEMPLATES[locale]!,
      formatMoney(summary.revenue, locale),
      String(summary.orderCount),
      topLine,
      lowLine,
    ).trimEnd();

    let sent = 0;
    let failed = 0;
    for (const chatId of summary.ownerChatIds) {
      const ok = await this.telegram.sendMessage(chatId, text);
      if (ok) sent++;
      else failed++;
    }
    if (failed > 0) {
      this.logger.warn(
        `daily-summary store=${summary.storeId} sent=${sent} failed=${failed}`,
      );
    }
    return { sent, failed };
  }
}
