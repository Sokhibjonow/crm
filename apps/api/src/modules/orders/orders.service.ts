import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentStatus, Prisma } from '@savdo/db';
import { PrismaService } from '../../prisma/prisma.service';
import { TelegramNotificationsService } from '../telegram/telegram.notifications';
import type { AddItemDto } from './dto/add-item.dto';
import type { AddPaymentDto } from './dto/add-payment.dto';
import type { CreateOrderDto } from './dto/create-order.dto';
import type { ListOrdersDto } from './dto/list-orders.dto';
import type { UpdateOrderDto } from './dto/update-order.dto';

type Tx = Prisma.TransactionClient;

const DEFAULT_TAKE = 25;

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.NEW]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PACKING, OrderStatus.CANCELLED],
  [OrderStatus.PACKING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

const ORDER_INCLUDE = {
  items: {
    include: {
      product: { select: { id: true, name: true, sku: true } },
    },
    orderBy: { id: 'asc' } as const,
  },
  customer: { select: { id: true, name: true, phone: true } },
  payments: { orderBy: { createdAt: 'desc' } as const },
} satisfies Prisma.OrderInclude;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramNotificationsService,
  ) {}

  async list(storeId: string, query: ListOrdersDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const page = query.page ?? 1;
    const skip = (page - 1) * take;

    const where = this.buildWhere(storeId, query);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { items, total, page, take };
  }

  /** Same filters as list, but returns all rows (no pagination) for export. */
  async listForExport(storeId: string, query: ListOrdersDto) {
    const where = this.buildWhere(storeId, query);
    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        items: { include: { product: { select: { name: true, sku: true } } } },
      },
    });
  }

  private buildWhere(storeId: string, query: ListOrdersDto): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = { storeId };
    if (query.status) where.status = query.status;
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.customerId) where.customerId = query.customerId;
    if (query.q) {
      where.customer = {
        is: {
          OR: [
            { name: { contains: query.q, mode: 'insensitive' } },
            { phone: { contains: query.q, mode: 'insensitive' } },
          ],
        },
      };
    }
    if (query.dateFrom || query.dateTo) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (query.dateFrom) createdAt.gte = startOfUtcDay(new Date(query.dateFrom));
      if (query.dateTo) {
        // inclusive end-of-day
        const d = startOfUtcDay(new Date(query.dateTo));
        d.setUTCDate(d.getUTCDate() + 1);
        createdAt.lt = d;
      }
      where.createdAt = createdAt;
    }
    return where;
  }

  async get(storeId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, storeId },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async create(storeId: string, userId: string | undefined, dto: CreateOrderDto) {
    const created = await this.prisma.$transaction(async (tx) => {
      // Resolve and validate products (same store, in stock, get default prices).
      const productIds = Array.from(new Set(dto.items.map((i) => i.productId)));
      const products = await tx.product.findMany({
        where: { id: { in: productIds }, storeId },
      });
      const byId = new Map(products.map((p) => [p.id, p]));
      if (byId.size !== productIds.length) {
        throw new BadRequestException('One or more products not found in this store');
      }

      // Validate stock and prepare item rows.
      const itemRows: { productId: string; qty: number; unitPrice: Prisma.Decimal; lineTotal: Prisma.Decimal }[] = [];
      const stockChanges = new Map<string, number>(); // productId -> qty deducted (total per product)
      for (const item of dto.items) {
        const p = byId.get(item.productId)!;
        const already = stockChanges.get(item.productId) ?? 0;
        if (p.stock < already + item.qty) {
          throw new BadRequestException(`Not enough stock for "${p.name}"`);
        }
        stockChanges.set(item.productId, already + item.qty);
        const unitPrice =
          item.unitPrice !== undefined
            ? new Prisma.Decimal(item.unitPrice)
            : new Prisma.Decimal(p.salePrice);
        const lineTotal = unitPrice.times(item.qty);
        itemRows.push({ productId: item.productId, qty: item.qty, unitPrice, lineTotal });
      }

      // Validate customer belongs to store.
      if (dto.customerId) {
        const c = await tx.customer.findFirst({
          where: { id: dto.customerId, storeId },
          select: { id: true },
        });
        if (!c) throw new BadRequestException('Customer not found in this store');
      }

      // Per-store sequence.
      const last = await tx.order.aggregate({
        where: { storeId },
        _max: { number: true },
      });
      const number = (last._max.number ?? 0) + 1;

      const subtotal = itemRows.reduce(
        (s, r) => s.plus(r.lineTotal),
        new Prisma.Decimal(0),
      );
      const discount = new Prisma.Decimal(dto.discount ?? 0);
      const total = subtotal.minus(discount);
      const totalNonNeg = total.lt(0) ? new Prisma.Decimal(0) : total;

      const created = await tx.order.create({
        data: {
          storeId,
          customerId: dto.customerId ?? null,
          number,
          status: OrderStatus.NEW,
          paymentStatus: PaymentStatus.UNPAID,
          subtotal,
          discount,
          total: totalNonNeg,
          paidAmount: new Prisma.Decimal(0),
          notes: dto.notes ?? null,
          createdById: userId ?? null,
          items: {
            create: itemRows,
          },
        },
        include: ORDER_INCLUDE,
      });

      // Deduct stock.
      for (const [productId, qty] of stockChanges) {
        await tx.product.update({
          where: { id: productId },
          data: { stock: { decrement: qty } },
        });
      }

      await tx.activityLog.create({
        data: {
          storeId,
          userId: userId ?? null,
          entityType: 'order',
          entityId: created.id,
          action: 'created',
          metadata: { number, total: totalNonNeg.toString() } as Prisma.InputJsonValue,
        },
      });

      return created;
    });
    this.telegram.notifyOrderStatus(created.id, 'CREATED');
    return created;
  }

  async update(storeId: string, id: string, dto: UpdateOrderDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.order.findFirst({ where: { id, storeId } });
      if (!existing) throw new NotFoundException('Order not found');
      if (existing.status !== OrderStatus.NEW) {
        throw new ConflictException('Only NEW orders can be edited');
      }

      if (dto.customerId) {
        const c = await tx.customer.findFirst({
          where: { id: dto.customerId, storeId },
          select: { id: true },
        });
        if (!c) throw new BadRequestException('Customer not found in this store');
      }

      const data: Prisma.OrderUpdateInput = {};
      if (dto.customerId !== undefined) {
        data.customer = dto.customerId
          ? { connect: { id: dto.customerId } }
          : { disconnect: true };
      }
      if (dto.notes !== undefined) data.notes = dto.notes || null;
      if (dto.discount !== undefined) {
        data.discount = new Prisma.Decimal(dto.discount);
      }
      await tx.order.update({ where: { id }, data });

      // Recompute total if discount changed.
      if (dto.discount !== undefined) {
        await this.recomputeTotals(tx, id);
      }

      return tx.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
    });
  }

  async addItem(storeId: string, orderId: string, dto: AddItemDto) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id: orderId, storeId } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== OrderStatus.NEW) {
        throw new ConflictException('Only NEW orders can have items added');
      }
      const product = await tx.product.findFirst({
        where: { id: dto.productId, storeId },
      });
      if (!product) throw new BadRequestException('Product not found in this store');
      if (product.stock < dto.qty) {
        throw new BadRequestException(`Not enough stock for "${product.name}"`);
      }
      const unitPrice =
        dto.unitPrice !== undefined
          ? new Prisma.Decimal(dto.unitPrice)
          : new Prisma.Decimal(product.salePrice);
      const lineTotal = unitPrice.times(dto.qty);

      await tx.orderItem.create({
        data: { orderId, productId: dto.productId, qty: dto.qty, unitPrice, lineTotal },
      });
      await tx.product.update({
        where: { id: dto.productId },
        data: { stock: { decrement: dto.qty } },
      });
      await this.recomputeTotals(tx, orderId);

      return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: ORDER_INCLUDE });
    });
  }

  async removeItem(storeId: string, orderId: string, itemId: string) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id: orderId, storeId } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status !== OrderStatus.NEW) {
        throw new ConflictException('Only NEW orders can have items removed');
      }
      const item = await tx.orderItem.findFirst({ where: { id: itemId, orderId } });
      if (!item) throw new NotFoundException('Item not found');

      await tx.orderItem.delete({ where: { id: itemId } });
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.qty } },
      });
      await this.recomputeTotals(tx, orderId);

      return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: ORDER_INCLUDE });
    });
  }

  async updateStatus(
    storeId: string,
    id: string,
    userId: string | undefined,
    next: OrderStatus,
  ) {
    const updated = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id, storeId },
        include: { items: true },
      });
      if (!order) throw new NotFoundException('Order not found');
      const allowed = ALLOWED_TRANSITIONS[order.status];
      if (!allowed.includes(next)) {
        throw new ConflictException(
          `Cannot transition order from ${order.status} to ${next}`,
        );
      }

      // If cancelling, restore stock for all items.
      if (next === OrderStatus.CANCELLED) {
        for (const it of order.items) {
          await tx.product.update({
            where: { id: it.productId },
            data: { stock: { increment: it.qty } },
          });
        }
      }

      await tx.order.update({ where: { id }, data: { status: next } });
      await tx.activityLog.create({
        data: {
          storeId,
          userId: userId ?? null,
          entityType: 'order',
          entityId: id,
          action: 'status_changed',
          metadata: { from: order.status, to: next } as Prisma.InputJsonValue,
        },
      });

      return tx.order.findUniqueOrThrow({ where: { id }, include: ORDER_INCLUDE });
    });
    this.telegram.notifyOrderStatus(updated.id, next);
    return updated;
  }

  async addPayment(
    storeId: string,
    orderId: string,
    userId: string | undefined,
    dto: AddPaymentDto,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id: orderId, storeId } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.status === OrderStatus.CANCELLED) {
        throw new ConflictException('Cannot add payment to a cancelled order');
      }

      const amount = new Prisma.Decimal(dto.amount);
      await tx.payment.create({
        data: { orderId, amount, method: dto.method, reference: dto.reference ?? null },
      });

      const newPaid = new Prisma.Decimal(order.paidAmount).plus(amount);
      const paymentStatus: PaymentStatus = newPaid.eq(0)
        ? PaymentStatus.UNPAID
        : newPaid.gte(order.total)
          ? PaymentStatus.PAID
          : PaymentStatus.PARTIAL;

      await tx.order.update({
        where: { id: orderId },
        data: { paidAmount: newPaid, paymentStatus },
      });

      // Increment customer.totalSpent if there's a customer.
      if (order.customerId) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: { totalSpent: { increment: amount } },
        });
      }

      await tx.activityLog.create({
        data: {
          storeId,
          userId: userId ?? null,
          entityType: 'order',
          entityId: orderId,
          action: 'payment_added',
          metadata: {
            amount: amount.toString(),
            method: dto.method,
            newPaid: newPaid.toString(),
            paymentStatus,
          } as Prisma.InputJsonValue,
        },
      });

      return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: ORDER_INCLUDE });
    });
  }

  async listPayments(storeId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, storeId },
      select: { id: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return this.prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async recomputeTotals(tx: Tx, orderId: string): Promise<void> {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });
    const subtotal = order.items.reduce(
      (s, it) => s.plus(it.lineTotal),
      new Prisma.Decimal(0),
    );
    const discount = new Prisma.Decimal(order.discount);
    const total = subtotal.minus(discount);
    const totalNonNeg = total.lt(0) ? new Prisma.Decimal(0) : total;

    // Recompute paymentStatus against new total.
    const paid = new Prisma.Decimal(order.paidAmount);
    const paymentStatus: PaymentStatus = paid.eq(0)
      ? PaymentStatus.UNPAID
      : paid.gte(totalNonNeg)
        ? PaymentStatus.PAID
        : PaymentStatus.PARTIAL;

    await tx.order.update({
      where: { id: orderId },
      data: { subtotal, total: totalNonNeg, paymentStatus },
    });
  }
}
