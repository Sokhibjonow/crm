import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@savdo/db';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import type { ListCustomersDto } from './dto/list-customers.dto';
import type { UpdateCustomerDto } from './dto/update-customer.dto';

const DEFAULT_TAKE = 25;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(storeId: string, query: ListCustomersDto) {
    const take = query.take ?? DEFAULT_TAKE;
    const page = query.page ?? 1;
    const skip = (page - 1) * take;

    const where: Prisma.CustomerWhereInput = { storeId };
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { phone: { contains: query.q, mode: 'insensitive' } },
        { telegram: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { items, total, page, take };
  }

  async get(storeId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, storeId },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(storeId: string, dto: CreateCustomerDto) {
    try {
      return await this.prisma.customer.create({
        data: {
          storeId,
          name: dto.name,
          phone: dto.phone || null,
          telegram: dto.telegram || null,
          notes: dto.notes || null,
          tags: dto.tags ?? [],
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Customer with this phone already exists');
      }
      throw err;
    }
  }

  async update(storeId: string, id: string, dto: UpdateCustomerDto) {
    await this.get(storeId, id);
    try {
      return await this.prisma.customer.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.phone !== undefined && { phone: dto.phone || null }),
          ...(dto.telegram !== undefined && { telegram: dto.telegram || null }),
          ...(dto.notes !== undefined && { notes: dto.notes || null }),
          ...(dto.tags !== undefined && { tags: dto.tags }),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Customer with this phone already exists');
      }
      throw err;
    }
  }

  async remove(storeId: string, id: string) {
    await this.get(storeId, id);
    await this.prisma.customer.delete({ where: { id } });
  }
}
