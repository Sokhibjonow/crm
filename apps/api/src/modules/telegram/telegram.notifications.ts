import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus } from '@savdo/db';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramService } from './telegram.service';

type LocalizedTemplates = Record<string, Record<OrderStatus | 'CREATED', string>>;

// {0} = order number, {1} = store name, {2} = total
const TEMPLATES: LocalizedTemplates = {
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
   * Notify the customer linked to an order about its current status. Fire and forget —
   * never throws to the caller.
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
        number: true,
        total: true,
        customer: { select: { telegramChatId: true } },
        store: { select: { name: true, locale: true } },
      },
    });
    if (!order || !order.customer?.telegramChatId) return;
    const locale = TEMPLATES[order.store.locale] ? order.store.locale : 'ru';
    const localeTemplates = TEMPLATES[locale]!;
    const template = localeTemplates[event];
    if (!template) return;
    const text = format(template, String(order.number), order.store.name, order.total.toString());
    await this.telegram.sendMessage(order.customer.telegramChatId, text);
  }
}
