import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { OrderStatus, Role } from '@savdo/db';
import type { Response } from 'express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { JwtPayload } from '../../common/auth/jwt-payload.type';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { AddItemDto } from './dto/add-item.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { OrdersExportService } from './orders.export';
import { OrdersService } from './orders.service';

// Which role can move an order INTO each status.
const STATUS_TRANSITION_ROLES: Record<OrderStatus, Role[]> = {
  [OrderStatus.NEW]: [], // never a target
  [OrderStatus.CONFIRMED]: [Role.OWNER, Role.MANAGER, Role.CASHIER],
  [OrderStatus.PACKING]: [Role.OWNER, Role.MANAGER, Role.WAREHOUSE],
  [OrderStatus.SHIPPED]: [Role.OWNER, Role.MANAGER, Role.WAREHOUSE, Role.COURIER],
  [OrderStatus.DELIVERED]: [Role.OWNER, Role.MANAGER, Role.COURIER],
  [OrderStatus.CANCELLED]: [Role.OWNER, Role.MANAGER],
  // Returns are a finance/owner decision — same gating as cancellation.
  [OrderStatus.RETURNED]: [Role.OWNER, Role.MANAGER],
};

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly exportService: OrdersExportService,
  ) {}

  // Reads: every authenticated role sees orders.
  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ListOrdersDto) {
    return this.orders.list(user.storeId, query);
  }

  // Export only for the people who manage the business side.
  @Get('export')
  @Roles(Role.OWNER, Role.MANAGER)
  async export(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListOrdersDto,
    @Query('format') format: string,
    @Res() res: Response,
  ): Promise<void> {
    if (format !== 'csv' && format !== 'xlsx') {
      throw new BadRequestException('format must be csv or xlsx');
    }
    const { buffer, filename } =
      format === 'xlsx'
        ? await this.exportService.exportXlsx(user.storeId, query)
        : await this.exportService.exportCsv(user.storeId, query);
    const contentType =
      format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv; charset=utf-8';
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.orders.get(user.storeId, id);
  }

  @Post()
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.storeId, user.userId, dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER)
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.orders.update(user.storeId, id, dto);
  }

  @Post(':id/items')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER)
  addItem(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AddItemDto,
  ) {
    return this.orders.addItem(user.storeId, id, dto);
  }

  @Delete(':id/items/:itemId')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER)
  @HttpCode(HttpStatus.OK)
  removeItem(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.orders.removeItem(user.storeId, id, itemId);
  }

  // Status: allow the endpoint to anyone with an order role, but check the
  // specific transition against role here so e.g. a COURIER can't confirm
  // an order even by hitting the API directly.
  @Post(':id/status')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    const allowed = STATUS_TRANSITION_ROLES[dto.status] ?? [];
    if (!allowed.includes(user.role)) {
      throw new ForbiddenException(
        `Role ${user.role} cannot move an order to ${dto.status}`,
      );
    }
    return this.orders.updateStatus(user.storeId, id, user.userId, dto.status);
  }

  @Post(':id/payments')
  @Roles(Role.OWNER, Role.MANAGER, Role.CASHIER, Role.COURIER)
  addPayment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AddPaymentDto,
  ) {
    return this.orders.addPayment(user.storeId, id, user.userId, dto);
  }

  @Get(':id/payments')
  listPayments(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.orders.listPayments(user.storeId, id);
  }
}
