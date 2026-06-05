import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OwnerTelegramLinkController } from './owner-telegram.controller';
import { TelegramLinkController } from './telegram.controller';
import { TelegramNotificationsService } from './telegram.notifications';
import { TelegramService } from './telegram.service';
import { TelegramWebhookController } from './telegram.webhook.controller';

@Module({
  imports: [AuthModule],
  controllers: [
    TelegramLinkController,
    OwnerTelegramLinkController,
    TelegramWebhookController,
  ],
  providers: [TelegramService, TelegramNotificationsService],
  exports: [TelegramNotificationsService],
})
export class TelegramModule {}
