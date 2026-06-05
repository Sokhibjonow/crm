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
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@savdo/db';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { JwtPayload } from '../../common/auth/jwt-payload.type';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsDto } from './dto/list-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  // Reads: everyone except COURIER (couriers only see their orders).
  @Get()
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER, Role.WAREHOUSE)
  list(@CurrentUser() user: JwtPayload, @Query() query: ListProductsDto) {
    return this.products.list(user.storeId, query);
  }

  @Get('categories')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER, Role.WAREHOUSE)
  categories(@CurrentUser() user: JwtPayload) {
    return this.products.categories(user.storeId);
  }

  @Get('tags')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER, Role.WAREHOUSE)
  tags(@CurrentUser() user: JwtPayload) {
    return this.products.tags(user.storeId);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER, Role.WAREHOUSE)
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.products.get(user.storeId, id);
  }

  // Mutations: OWNER, MANAGER only.
  @Post()
  @Roles(Role.OWNER, Role.MANAGER)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateProductDto) {
    return this.products.create(user.storeId, dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.products.update(user.storeId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.products.remove(user.storeId, id);
  }

  // Stock adjustments: warehouse can do this too.
  @Post(':id/stock-adjust')
  @Roles(Role.OWNER, Role.MANAGER, Role.WAREHOUSE)
  adjustStock(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.products.adjustStock(user.storeId, id, user.userId, dto);
  }
}
