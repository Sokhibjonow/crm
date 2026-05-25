import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TelegramModule } from '../telegram/telegram.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule, TelegramModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
