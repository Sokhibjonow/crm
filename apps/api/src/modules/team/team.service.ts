import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@savdo/db';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateMemberDto } from './dto/create-member.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import type { UpdateMemberDto } from './dto/update-member.dto';

const BCRYPT_ROUNDS = 10;

const MEMBER_SELECT = {
  id: true,
  storeId: true,
  name: true,
  email: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  list(storeId: string) {
    return this.prisma.user.findMany({
      where: { storeId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
      select: MEMBER_SELECT,
    });
  }

  async get(storeId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, storeId },
      select: MEMBER_SELECT,
    });
    if (!user) throw new NotFoundException('Member not found');
    return user;
  }

  async create(storeId: string, dto: CreateMemberDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { storeId, email },
      select: { id: true },
    });
    if (existing) throw new ConflictException('Email already in use in this store');
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    return this.prisma.user.create({
      data: {
        storeId,
        name: dto.name,
        email,
        passwordHash,
        phone: dto.phone || null,
        role: dto.role,
      },
      select: MEMBER_SELECT,
    });
  }

  async update(storeId: string, callerId: string, id: string, dto: UpdateMemberDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, storeId },
      select: { id: true, role: true, isActive: true },
    });
    if (!user) throw new NotFoundException('Member not found');

    // Caller cannot change their own role or deactivate themselves.
    if (callerId === id) {
      if (dto.role !== undefined && dto.role !== user.role) {
        throw new ForbiddenException('Cannot change your own role');
      }
      if (dto.isActive === false) {
        throw new ForbiddenException('Cannot deactivate yourself');
      }
    }

    // Preserve at least one active OWNER.
    const losingOwner =
      user.role === Role.OWNER &&
      ((dto.role !== undefined && dto.role !== Role.OWNER) ||
        (user.isActive && dto.isActive === false));
    if (losingOwner) {
      const otherActiveOwners = await this.prisma.user.count({
        where: {
          storeId,
          role: Role.OWNER,
          isActive: true,
          id: { not: id },
        },
      });
      if (otherActiveOwners === 0) {
        throw new BadRequestException('At least one active OWNER must remain');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone || null }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: MEMBER_SELECT,
    });
  }

  async resetPassword(storeId: string, id: string, dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { id, storeId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('Member not found');
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  async deactivate(storeId: string, callerId: string, id: string) {
    // Reuse update path so the last-owner check fires consistently.
    return this.update(storeId, callerId, id, { isActive: false });
  }
}
