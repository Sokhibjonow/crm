import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@savdo/db';
import { PrismaService } from '../../prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS = 30;
const TOP_CUSTOMERS_LIMIT = 10;

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function formatDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface GroupCount {
  _all: number;
}
interface GroupTotalSum {
  total: Prisma.Decimal | null;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(storeId: string, days: number = DEFAULT_DAYS) {
    const todayStart = startOfUtcDay(new Date());
    const rangeStart = new Date(todayStart.getTime() - (days - 1) * DAY_MS);

    const [payments, statusGroups, staffGroups, topCustomerGroups] =
      await this.prisma.$transaction([
        this.prisma.payment.findMany({
          where: {
            order: { storeId },
            createdAt: { gte: rangeStart },
          },
          select: { amount: true, createdAt: true },
        }),
        this.prisma.order.groupBy({
          by: ['status'],
          where: { storeId, createdAt: { gte: rangeStart } },
          _count: { _all: true },
          _sum: { total: true },
          orderBy: { status: 'asc' },
        }),
        this.prisma.order.groupBy({
          by: ['createdById'],
          where: {
            storeId,
            createdAt: { gte: rangeStart },
            status: { not: OrderStatus.CANCELLED },
          },
          _count: { _all: true },
          _sum: { total: true },
          orderBy: { _sum: { total: 'desc' } },
        }),
        this.prisma.order.groupBy({
          by: ['customerId'],
          where: {
            storeId,
            createdAt: { gte: rangeStart },
            customerId: { not: null },
            status: { not: OrderStatus.CANCELLED },
          },
          _count: { _all: true },
          _sum: { total: true },
          orderBy: { _sum: { total: 'desc' } },
          take: TOP_CUSTOMERS_LIMIT,
        }),
      ]);

    // Daily revenue series.
    const byDay = new Map<string, { revenue: Prisma.Decimal; count: number }>();
    for (const p of payments) {
      const key = formatDay(p.createdAt);
      const bucket = byDay.get(key) ?? { revenue: new Prisma.Decimal(0), count: 0 };
      bucket.revenue = bucket.revenue.plus(p.amount);
      bucket.count += 1;
      byDay.set(key, bucket);
    }
    const daily: Array<{ date: string; revenue: string; payments: number }> = [];
    for (let i = 0; i < days; i++) {
      const day = new Date(rangeStart.getTime() + i * DAY_MS);
      const key = formatDay(day);
      const bucket = byDay.get(key);
      daily.push({
        date: key,
        revenue: (bucket?.revenue ?? new Prisma.Decimal(0)).toString(),
        payments: bucket?.count ?? 0,
      });
    }
    const totalRevenue = daily
      .reduce((s, d) => s.plus(d.revenue), new Prisma.Decimal(0))
      .toString();

    // Status breakdown.
    const statusBreakdown = statusGroups.map((g) => {
      const count = (g._count as GroupCount)._all;
      const sum = g._sum as GroupTotalSum;
      return {
        status: g.status,
        count,
        total: (sum.total ?? new Prisma.Decimal(0)).toString(),
      };
    });

    // Staff performance.
    const userIds = staffGroups
      .map((g) => g.createdById)
      .filter((id): id is string => id !== null);
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds }, storeId },
          select: { id: true, name: true, email: true },
        })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    const staff = staffGroups.map((g) => {
      const count = (g._count as GroupCount)._all;
      const sum = g._sum as GroupTotalSum;
      const user = g.createdById ? userById.get(g.createdById) : undefined;
      return {
        userId: g.createdById,
        name: user?.name ?? null,
        email: user?.email ?? null,
        orders: count,
        revenue: (sum.total ?? new Prisma.Decimal(0)).toString(),
      };
    });

    // Top customers.
    const customerIds = topCustomerGroups
      .map((g) => g.customerId)
      .filter((id): id is string => id !== null);
    const customers = customerIds.length
      ? await this.prisma.customer.findMany({
          where: { id: { in: customerIds }, storeId },
          select: { id: true, name: true, phone: true },
        })
      : [];
    const customerById = new Map(customers.map((c) => [c.id, c]));
    const topCustomers = topCustomerGroups
      .map((g) => {
        if (!g.customerId) return null;
        const c = customerById.get(g.customerId);
        if (!c) return null;
        const count = (g._count as GroupCount)._all;
        const sum = g._sum as GroupTotalSum;
        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          orders: count,
          total: (sum.total ?? new Prisma.Decimal(0)).toString(),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return {
      days,
      rangeStart: rangeStart.toISOString(),
      rangeEnd: todayStart.toISOString(),
      totalRevenue,
      daily,
      statusBreakdown,
      staff,
      topCustomers,
    };
  }
}
