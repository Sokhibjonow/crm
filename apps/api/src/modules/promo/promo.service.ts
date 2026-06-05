import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PromoCodeType } from '@savdo/db';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePromoCodeDto, UpdatePromoCodeDto } from './dto/promo-code.dto';

/**
 * Result of resolving + validating a promo code against a subtotal.
 * `discount` is the amount in soms to subtract from the subtotal (capped so
 * the order total never goes negative). Callers store both the resolved
 * promoCodeId AND a string snapshot of the code on the order so the receipt
 * can still display "code applied: SUMMER15" even if the code is later
 * deleted.
 */
export interface ResolvedPromo {
  promoId: string;
  code: string;
  discount: Prisma.Decimal;
}

@Injectable()
export class PromoService {
  constructor(private readonly prisma: PrismaService) {}

  async list(storeId: string) {
    return this.prisma.promoCode.findMany({
      where: { storeId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async get(storeId: string, id: string) {
    const promo = await this.prisma.promoCode.findFirst({
      where: { id, storeId },
    });
    if (!promo) throw new NotFoundException('Promo code not found');
    return promo;
  }

  async create(storeId: string, dto: CreatePromoCodeDto) {
    try {
      return await this.prisma.promoCode.create({
        data: {
          storeId,
          code: dto.code.trim().toUpperCase(),
          type: dto.type,
          value: dto.value,
          minOrderTotal: dto.minOrderTotal ?? 0,
          maxUses: dto.maxUses ?? null,
          validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Promo code already exists');
      }
      throw err;
    }
  }

  async update(storeId: string, id: string, dto: UpdatePromoCodeDto) {
    await this.get(storeId, id);
    try {
      return await this.prisma.promoCode.update({
        where: { id },
        data: {
          ...(dto.code !== undefined && { code: dto.code.trim().toUpperCase() }),
          ...(dto.type !== undefined && { type: dto.type }),
          ...(dto.value !== undefined && { value: dto.value }),
          ...(dto.minOrderTotal !== undefined && { minOrderTotal: dto.minOrderTotal }),
          ...(dto.maxUses !== undefined && { maxUses: dto.maxUses }),
          ...(dto.validFrom !== undefined && {
            validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
          }),
          ...(dto.validUntil !== undefined && {
            validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
          }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Promo code already exists');
      }
      throw err;
    }
  }

  async remove(storeId: string, id: string) {
    await this.get(storeId, id);
    await this.prisma.promoCode.delete({ where: { id } });
  }

  /**
   * Look up a code, validate it against the given subtotal, and return the
   * resolved discount. Used both at order-creation time and by the
   * /promo-codes/preview endpoint so the UI can show the discount before
   * the user clicks "create order".
   */
  async resolve(
    storeId: string,
    rawCode: string,
    subtotal: Prisma.Decimal,
  ): Promise<ResolvedPromo> {
    const code = rawCode.trim().toUpperCase();
    if (!code) throw new BadRequestException('Promo code required');

    const promo = await this.prisma.promoCode.findUnique({
      where: { storeId_code: { storeId, code } },
    });
    if (!promo || !promo.isActive) {
      throw new BadRequestException('Promo code not valid');
    }

    const now = new Date();
    if (promo.validFrom && now < promo.validFrom) {
      throw new BadRequestException('Promo code is not active yet');
    }
    if (promo.validUntil && now > promo.validUntil) {
      throw new BadRequestException('Promo code has expired');
    }
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('Promo code usage limit reached');
    }
    if (subtotal.lt(promo.minOrderTotal)) {
      throw new BadRequestException(
        `Minimum order total is ${promo.minOrderTotal.toString()}`,
      );
    }

    let discount: Prisma.Decimal;
    if (promo.type === PromoCodeType.PERCENT) {
      // Clamp percent to [0, 100] defensively even though DB allows >100.
      const pct = promo.value.greaterThan(100) ? new Prisma.Decimal(100) : promo.value;
      discount = subtotal.times(pct).dividedBy(100);
    } else {
      discount = promo.value;
    }
    // Cap at subtotal so total never goes negative.
    if (discount.greaterThan(subtotal)) discount = subtotal;

    // Round to 2 dp.
    discount = discount.toDecimalPlaces(2);

    return { promoId: promo.id, code: promo.code, discount };
  }

  /**
   * Atomically bump the usedCount on a promo. Called from inside the order-
   * creation transaction by OrdersService when an order is created with a
   * promo applied. Safe to call multiple times — DB-level constraints keep
   * usedCount monotonic.
   */
  async markUsed(tx: Prisma.TransactionClient, promoId: string): Promise<void> {
    await tx.promoCode.update({
      where: { id: promoId },
      data: { usedCount: { increment: 1 } },
    });
  }
}
