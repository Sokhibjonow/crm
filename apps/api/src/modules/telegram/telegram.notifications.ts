import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus, Role } from '@savdo/db';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramService } from './telegram.service';

type LocalizedTemplates = Record<string, Record<OrderStatus | 'CREATED', string>>;

// Customer-facing templates ({0} = order number, {1} = store name, {2} = total).
const CUSTOMER_TEMPLATES: LocalizedTemplates = {
  ru: {
    CREATED: '🆕 Заказ #{0} от «{1}» принят. Сумма: {2}.',
    NEW: '🆕 Заказ #{0} от «{1}» создан.',
    CONFIRMED: '✅ Заказ #{0} от «{1}» подтверждён.',
    PACKING: '📦 Заказ #{0} от «{1}» собирается.',
    SHIPPED: '🚚 Заказ #{0} от «{1}» отправлен.',
    DELIVERED: '🎉 Заказ #{0} от «{1}» доставлен. Спасибо за покупку!',
    CANCELLED: '❌ Заказ #{0} от «{1}» отменён.',
    RETURNED: '↩️ Заказ #{0} от «{1}» оформлен возврат.',
  },
  uz: {
    CREATED: '🆕 «{1}» do\'konidan #{0} buyurtma qabul qilindi. Summa: {2}.',
    NEW: '🆕 «{1}» do\'konidan #{0} buyurtma yaratildi.',
    CONFIRMED: '✅ «{1}» do\'konidan #{0} buyurtma tasdiqlandi.',
    PACKING: '📦 «{1}» do\'konidan #{0} buyurtma qadoqlanmoqda.',
    SHIPPED: '🚚 «{1}» do\'konidan #{0} buyurtma jo\'natildi.',
    DELIVERED: '🎉 «{1}» do\'konidan #{0} buyurtma yetkazildi. Xaridingiz uchun rahmat!',
    CANCELLED: '❌ «{1}» do\'konidan #{0} buyurtma bekor qilindi.',
    RETURNED: '↩️ «{1}» do\'konidan #{0} buyurtma qaytarildi.',
  },
};

// Owner-facing templates ({0} = order number, {1} = customer label, {2} = total).
const OWNER_TEMPLATES: LocalizedTemplates = {
  ru: {
    CREATED: '🆕 Новый заказ #{0}\nКлиент: {1}\nСумма: {2}',
    NEW: '🆕 Заказ #{0} создан\nКлиент: {1}\nСумма: {2}',
    CONFIRMED: '✅ Заказ #{0} подтверждён ({1}). Сумма: {2}.',
    PACKING: '📦 Заказ #{0} в сборке ({1}).',
    SHIPPED: '🚚 Заказ #{0} отправлен ({1}).',
    DELIVERED: '🎉 Заказ #{0} доставлен ({1}). Сумма: {2}.',
    CANCELLED: '❌ Заказ #{0} отменён ({1}).',
    RETURNED: '↩️ Возврат по заказу #{0} ({1}). Сумма: {2}.',
  },
  uz: {
    CREATED: '🆕 Yangi buyurtma #{0}\nMijoz: {1}\nSumma: {2}',
    NEW: '🆕 #{0} buyurtma yaratildi\nMijoz: {1}\nSumma: {2}',
    CONFIRMED: '✅ #{0} buyurtma tasdiqlandi ({1}). Summa: {2}.',
    PACKING: '📦 #{0} buyurtma qadoqlanmoqda ({1}).',
    SHIPPED: '🚚 #{0} buyurtma jo\'natildi ({1}).',
    DELIVERED: '🎉 #{0} buyurtma yetkazildi ({1}). Summa: {2}.',
    CANCELLED: '❌ #{0} buyurtma bekor qilindi ({1}).',
    RETURNED: '↩️ #{0} buyurtma qaytarildi ({1}). Summa: {2}.',
  },
};

function format(template: string, ...args: string[]): string {
  return template.replace(/\{(\d+)\}/g, (_, i) => args[Number(i)] ?? '');
}

// Low-stock alert templates ({0} = product name, {1} = remaining stock,
// {2} = threshold).
const LOW_STOCK_TEMPLATES: Record<string, string> = {
  ru: '⚠️ Заканчивается «{0}»: осталось {1} шт (порог {2}).',
  uz: '⚠️ «{0}» tugab qolyapti: {1} ta qoldi (chegara {2}).',
};

@Injectable()
export class TelegramNotificationsService {
  private readonly logger = new Logger(TelegramNotificationsService.name);

  constructor(
    private readonly telegram: TelegramService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Notify both the linked customer and all linked OWNERs about an order event.
   * Fire and forget — never throws to the caller.
   */
  notifyOrderStatus(orderId: string, event: OrderStatus | 'CREATED'): void {
    if (!this.telegram.isEnabled()) return;
    void this.send(orderId, event).catch((err) => {
      this.logger.warn(`notifyOrderStatus(${orderId}, ${event}) failed: ${(err as Error).message}`);
    });
  }

  private async send(orderId: string, event: OrderStatus | 'CREATED'): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        storeId: true,
        number: true,
        total: true,
        customer: { select: { name: true, phone: true, telegramChatId: true } },
        store: { select: { name: true, locale: true } },
      },
    });
    if (!order) return;

    const locale = CUSTOMER_TEMPLATES[order.store.locale] ? order.store.locale : 'ru';

    // 1. Notify the linked customer (existing behavior).
    if (order.customer?.telegramChatId) {
      const customerTemplate = CUSTOMER_TEMPLATES[locale]![event];
      if (customerTemplate) {
        const text = format(
          customerTemplate,
          String(order.number),
          order.store.name,
          order.total.toString(),
        );
        await this.telegram.sendMessage(order.customer.telegramChatId, text);
      }
    }

    // 2. Notify all linked OWNERs of the store.
    const ownerTemplate = OWNER_TEMPLATES[locale]![event];
    if (!ownerTemplate) return;

    const owners = await this.prisma.user.findMany({
      where: {
        storeId: order.storeId,
        role: Role.OWNER,
        isActive: true,
        telegramChatId: { not: null },
      },
      select: { telegramChatId: true },
    });
    if (owners.length === 0) return;

    const customerLabel =
      order.customer?.name ??
      order.customer?.phone ??
      (locale === 'uz' ? 'Mijozsiz' : 'Без клиента');

    const text = format(
      ownerTemplate,
      String(order.number),
      customerLabel,
      order.total.toString(),
    );

    await Promise.all(
      owners.map((o) =>
        o.telegramChatId ? this.telegram.sendMessage(o.telegramChatId, text) : Promise.resolve(false),
      ),
    );
  }

  /**
   * Notify owners that products have just dropped to/below their low-stock
   * threshold. `transitioned` lists products that crossed the threshold during
   * the current operation (callers should compute this before/after stock
   * deductions). Fire and forget.
   */
  notifyLowStock(
    storeId: string,
    transitioned: { productId: string; name: string; stock: number; threshold: number }[],
  ): void {
    if (!this.telegram.isEnabled() || transitioned.length === 0) return;
    void this.sendLowStock(storeId, transitioned).catch((err) => {
      this.logger.warn(`notifyLowStock(${storeId}) failed: ${(err as Error).message}`);
    });
  }

  private async sendLowStock(
    storeId: string,
    transitioned: { productId: string; name: string; stock: number; threshold: number }[],
  ): Promise<void> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { locale: true },
    });
    if (!store) return;
    const locale = LOW_STOCK_TEMPLATES[store.locale] ? store.locale : 'ru';
    const template = LOW_STOCK_TEMPLATES[locale]!;

    const owners = await this.prisma.user.findMany({
      where: {
        storeId,
        role: Role.OWNER,
        isActive: true,
        telegramChatId: { not: null },
      },
      select: { telegramChatId: true },
    });
    if (owners.length === 0) return;

    // One message per product so each row is independently readable.
    const lines = transitioned.map((p) =>
      format(template, p.name, String(p.stock), String(p.threshold)),
    );
    const text = lines.join('\n');

    await Promise.all(
      owners.map((o) =>
        o.telegramChatId ? this.telegram.sendMessage(o.telegramChatId, text) : Promise.resolve(false),
      ),
    );
  }
}
