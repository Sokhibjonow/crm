import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TelegramLinkController } from './telegram.controller';
import { TelegramNotificationsService } from './telegram.notifications';
import { TelegramService } from './telegram.service';

@Module({
  imports: [AuthModule],
  controllers: [TelegramLinkController],
  providers: [TelegramService, TelegramNotificationsService],
  exports: [TelegramNotificationsService],
})
export class TelegramModule {}
