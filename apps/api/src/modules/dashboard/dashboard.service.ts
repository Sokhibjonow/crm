import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@savdo/db';
import { PrismaService } from '../../prisma/prisma.service';

const PENDING_STATUSES: OrderStatus[] = [
  OrderStatus.NEW,
  OrderStatus.CONFIRMED,
  OrderStatus.PACKING,
  OrderStatus.SHIPPED,
];

const RECENT_LIMIT = 5;
const TOP_PRODUCTS_LIMIT = 5;
const TOP_PRODUCTS_DAYS = 7;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(storeId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(todayStart.getTime() - TOP_PRODUCTS_DAYS * 24 * 60 * 60 * 1000);

    const [
      ordersToday,
      revenueAgg,
      pendingOrders,
      lowStockProducts,
      recentOrders,
      topRaw,
    ] = await this.prisma.$transaction([
      this.prisma.order.count({
        where: { storeId, createdAt: { gte: todayStart } },
      }),
      this.prisma.payment.aggregate({
        where: {
          order: { storeId },
          createdAt: { gte: todayStart },
        },
        _sum: { amount: true },
      }),
      this.prisma.order.count({
        where: { storeId, status: { in: PENDING_STATUSES } },
      }),
      this.prisma.product.count({
        where: {
          storeId,
          isActive: true,
          lowStockThreshold: { gt: 0 },
          stock: { lte: this.prisma.product.fields.lowStockThreshold },
        },
      }),
      this.prisma.order.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
        take: RECENT_LIMIT,
        include: {
          customer: { select: { id: true, name: true } },
        },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          order: {
            storeId,
            createdAt: { gte: weekAgo },
            status: { not: OrderStatus.CANCELLED },
          },
        },
        _sum: { qty: true, lineTotal: true },
        orderBy: { _sum: { lineTotal: 'desc' } },
        take: TOP_PRODUCTS_LIMIT,
      }),
    ]);

    const productIds = topRaw.map((r) => r.productId);
    const products = productIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: productIds }, storeId },
          select: { id: true, name: true, sku: true },
        })
      : [];
    const productById = new Map(products.map((p) => [p.id, p]));

    const topProducts = topRaw
      .map((r) => {
        const p = productById.get(r.productId);
        if (!p) return null;
        const sum = r._sum;
        return {
          id: p.id,
          name: p.name,
          sku: p.sku,
          qty: sum?.qty ?? 0,
          revenue: (sum?.lineTotal ?? new Prisma.Decimal(0)).toString(),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    return {
      ordersToday,
      revenueToday: (revenueAgg._sum.amount ?? new Prisma.Decimal(0)).toString(),
      pendingOrders,
      lowStockProducts,
      recentOrders,
      topProducts,
    };
  }
}
