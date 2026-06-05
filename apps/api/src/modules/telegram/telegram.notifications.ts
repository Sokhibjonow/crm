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
  },
  uz: {
    CREATED: '🆕 «{1}» do\'konidan #{0} buyurtma qabul qilindi. Summa: {2}.',
    NEW: '🆕 «{1}» do\'konidan #{0} buyurtma yaratildi.',
    CONFIRMED: '✅ «{1}» do\'konidan #{0} buyurtma tasdiqlandi.',
    PACKING: '📦 «{1}» do\'konidan #{0} buyurtma qadoqlanmoqda.',
    SHIPPED: '🚚 «{1}» do\'konidan #{0} buyurtma jo\'natildi.',
    DELIVERED: '🎉 «{1}» do\'konidan #{0} buyurtma yetkazildi. Xaridingiz uchun rahmat!',
    CANCELLED: '❌ «{1}» do\'konidan #{0} buyurtma bekor qilindi.',
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
  },
  uz: {
    CREATED: '🆕 Yangi buyurtma #{0}\nMijoz: {1}\nSumma: {2}',
    NEW: '🆕 #{0} buyurtma yaratildi\nMijoz: {1}\nSumma: {2}',
    CONFIRMED: '✅ #{0} buyurtma tasdiqlandi ({1}). Summa: {2}.',
    PACKING: '📦 #{0} buyurtma qadoqlanmoqda ({1}).',
    SHIPPED: '🚚 #{0} buyurtma jo\'natildi ({1}).',
    DELIVERED: '🎉 #{0} buyurtma yetkazildi ({1}). Summa: {2}.',
    CANCELLED: '❌ #{0} buyurtma bekor qilindi ({1}).',
  },
};

function format(template: string, ...args: string[]): string {
  return template.replace(/\{(\d+)\}/g, (_, i) => args[Number(i)] ?? '');
}

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
}
