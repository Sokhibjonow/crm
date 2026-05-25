import {
  BadRequestException,
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
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { JwtPayload } from '../../common/auth/jwt-payload.type';
import { AddItemDto } from './dto/add-item.dto';
import { AddPaymentDto } from './dto/add-payment.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersDto } from './dto/list-orders.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { OrdersExportService } from './orders.export';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly exportService: OrdersExportService,
  ) {}

  @Get()
  list(@CurrentUser() user: JwtPayload, @Query() query: ListOrdersDto) {
    return this.orders.list(user.storeId, query);
  }

  // IMPORTANT: declared before ':id' so the literal route matches first.
  @Get('export')
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
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrderDto) {
    return this.orders.create(user.storeId, user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOrderDto,
  ) {
    return this.orders.update(user.storeId, id, dto);
  }

  @Post(':id/items')
  addItem(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: AddItemDto,
  ) {
    return this.orders.addItem(user.storeId, id, dto);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.OK)
  removeItem(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.orders.removeItem(user.storeId, id, itemId);
  }

  @Post(':id/status')
  updateStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.orders.updateStatus(user.storeId, id, user.userId, dto.status);
  }

  @Post(':id/payments')
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
