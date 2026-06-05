import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PromoModule } from '../promo/promo.module';
import { TelegramModule } from '../telegram/telegram.module';
import { OrdersController } from './orders.controller';
import { OrdersExportService } from './orders.export';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule, TelegramModule, PromoModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersExportService],
})
export class OrdersModule {}
