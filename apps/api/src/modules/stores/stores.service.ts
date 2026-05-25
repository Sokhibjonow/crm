import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UpdateStoreDto } from './dto/update-store.dto';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async get(storeId: string) {
    const store = await this.prisma.store.findUnique({ where: { id: storeId } });
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async update(storeId: string, dto: UpdateStoreDto) {
    await this.get(storeId);
    return this.prisma.store.update({
      where: { id: storeId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.locale !== undefined && { locale: dto.locale }),
      },
    });
  }
}
