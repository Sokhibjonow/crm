import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Prisma, Role } from '@savdo/db';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { JwtPayload } from '../../common/auth/jwt-payload.type';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import {
  CreatePromoCodeDto,
  PreviewPromoCodeDto,
  UpdatePromoCodeDto,
} from './dto/promo-code.dto';
import { PromoService } from './promo.service';

@Controller('promo-codes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PromoController {
  constructor(private readonly promo: PromoService) {}

  // Reads + preview: anyone who can create orders should be able to see / try
  // codes (cashier needs to apply them at checkout).
  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER)
  list(@CurrentUser() user: JwtPayload) {
    return this.promo.list(user.storeId);
  }

  @Post('preview')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER)
  async preview(
    @CurrentUser() user: JwtPayload,
    @Body() dto: PreviewPromoCodeDto,
  ) {
    const result = await this.promo.resolve(
      user.storeId,
      dto.code,
      new Prisma.Decimal(dto.subtotal),
    );
    return {
      code: result.code,
      discount: result.discount.toString(),
    };
  }

  // Mutations: OWNER / MANAGER only.
  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.promo.get(user.storeId, id);
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePromoCodeDto) {
    return this.promo.create(user.storeId, dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdatePromoCodeDto,
  ) {
    return this.promo.update(user.storeId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.promo.remove(user.storeId, id);
  }
}
