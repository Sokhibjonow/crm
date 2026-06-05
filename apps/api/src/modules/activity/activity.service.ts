import { Injectable } from '@nestjs/common';
import type { Prisma } from '@savdo/db';
import { PrismaService } from '../../prisma/prisma.service';
import { ActivityQueryDto } from './dto/activity-query.dto';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async list(storeId: string, q: ActivityQueryDto) {
    const limit = Math.min(MAX_LIMIT, q.limit ?? DEFAULT_LIMIT);
    const offset = q.offset ?? 0;

    const where: Prisma.ActivityLogWhereInput = { storeId };
    if (q.userId) where.userId = q.userId;
    if (q.entityType) where.entityType = q.entityType;
    if (q.action) where.action = q.action;
    if (q.dateFrom || q.dateTo) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (q.dateFrom) createdAt.gte = new Date(q.dateFrom);
      if (q.dateTo) createdAt.lte = new Date(q.dateTo);
      where.createdAt = createdAt;
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      total,
      limit,
      offset,
      items: rows.map((r) => ({
        id: r.id,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        metadata: r.metadata,
        createdAt: r.createdAt.toISOString(),
        user: r.user
          ? {
              id: r.user.id,
              name: r.user.name,
              email: r.user.email,
              role: r.user.role,
            }
          : null,
      })),
    };
  }
}
