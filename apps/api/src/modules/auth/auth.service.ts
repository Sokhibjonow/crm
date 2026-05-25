import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@savdo/db';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '../../common/auth/jwt-payload.type';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';

const BCRYPT_ROUNDS = 10;

export interface AuthResult {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    storeId: string;
    storeName: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const emailLower = dto.email.toLowerCase();

    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findFirst({ where: { email: emailLower } });
      if (existing) {
        throw new ConflictException('Email already in use');
      }

      const store = await tx.store.create({
        data: { name: dto.storeName },
      });

      const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
      const user = await tx.user.create({
        data: {
          storeId: store.id,
          name: dto.name,
          email: emailLower,
          passwordHash,
          role: Role.OWNER,
        },
      });

      return { store, user };
    });

    return this.buildAuthResult(result.user, result.store.name);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const emailLower = dto.email.toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: emailLower, isActive: true },
      include: { store: true },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.buildAuthResult(user, user.store.name);
  }

  async me(payload: JwtPayload): Promise<AuthResult['user']> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
      include: { store: true },
    });
    if (!user || !user.isActive) throw new UnauthorizedException();
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
      storeName: user.store.name,
    };
  }

  private buildAuthResult(
    user: { id: string; name: string; email: string; role: Role; storeId: string },
    storeName: string,
  ): AuthResult {
    const payload: JwtPayload = {
      userId: user.id,
      storeId: user.storeId,
      role: user.role,
      email: user.email,
    };
    const token = this.jwt.sign(payload);
    return {
      token,
      user: { ...user, storeName },
    };
  }
}
