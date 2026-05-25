import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@savdo/db';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdjustStockDto } from './dto/adjust-stock.dto';
import type { CreateProductDto } from './dto/create-product.dto';
import type { ListProductsDto } from './dto/list-products.dto';
import type { UpdateProductDto } from './dto/update-product.dto';

const DEFAULT_TAKE = 25;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(storeId: string, query: ListProductsDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const page = query.page ?? 1;
    const skip = (page - 1) * take;

    const where: Prisma.ProductWhereInput = { storeId };
    if (!query.includeArchived) where.isActive = true;
    if (query.category) where.category = query.category;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { sku: { contains: query.q, mode: 'insensitive' } },
        { category: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    // Low-stock filter: stock <= lowStockThreshold AND threshold > 0 (so the
    // default threshold of 0 doesn't flag everything).
    if (query.lowStock) {
      where.AND = [{ lowStockThreshold: { gt: 0 } }, { stock: { lte: this.prisma.product.fields.lowStockThreshold } }];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, take };
  }

  async categories(storeId: string): Promise<string[]> {
    const rows = await this.prisma.product.findMany({
      where: { storeId, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return rows.map((r) => r.category).filter((c): c is string => !!c);
  }

  async get(storeId: string, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, storeId } });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async create(storeId: string, dto: CreateProductDto) {
    try {
      return await this.prisma.product.create({
        data: {
          storeId,
          name: dto.name,
          sku: dto.sku || null,
          category: dto.category || null,
          size: dto.size || null,
          color: dto.color || null,
          stock: dto.stock ?? 0,
          lowStockThreshold: dto.lowStockThreshold ?? 0,
          costPrice: dto.costPrice ?? 0,
          salePrice: dto.salePrice ?? 0,
          supplier: dto.supplier || null,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Product with this SKU already exists');
      }
      throw err;
    }
  }

  async update(storeId: string, id: string, dto: UpdateProductDto) {
    await this.get(storeId, id);
    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.sku !== undefined && { sku: dto.sku || null }),
          ...(dto.category !== undefined && { category: dto.category || null }),
          ...(dto.size !== undefined && { size: dto.size || null }),
          ...(dto.color !== undefined && { color: dto.color || null }),
          ...(dto.stock !== undefined && { stock: dto.stock }),
          ...(dto.lowStockThreshold !== undefined && {
            lowStockThreshold: dto.lowStockThreshold,
          }),
          ...(dto.costPrice !== undefined && { costPrice: dto.costPrice }),
          ...(dto.salePrice !== undefined && { salePrice: dto.salePrice }),
          ...(dto.supplier !== undefined && { supplier: dto.supplier || null }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Product with this SKU already exists');
      }
      throw err;
    }
  }

  async remove(storeId: string, id: string) {
    await this.get(storeId, id);
    try {
      await this.prisma.product.delete({ where: { id } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new ConflictException('Product is used in existing orders; deactivate instead');
      }
      throw err;
    }
  }

  async adjustStock(
    storeId: string,
    id: string,
    userId: string | undefined,
    dto: AdjustStockDto,
  ) {
    if (dto.delta === 0) {
      throw new BadRequestException('Delta must not be zero');
    }
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({ where: { id, storeId } });
      if (!product) throw new NotFoundException('Product not found');
      const newStock = product.stock + dto.delta;
      if (newStock < 0) {
        throw new BadRequestException('Resulting stock cannot be negative');
      }
      const updated = await tx.product.update({
        where: { id },
        data: { stock: newStock },
      });
      await tx.activityLog.create({
        data: {
          storeId,
          userId: userId ?? null,
          entityType: 'product',
          entityId: id,
          action: 'stock_adjusted',
          metadata: {
            delta: dto.delta,
            reason: dto.reason ?? null,
            previousStock: product.stock,
            newStock,
          },
        },
      });
      return updated;
    });
  }
}
