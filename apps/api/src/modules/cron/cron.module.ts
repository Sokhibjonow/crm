import { Module } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module';
import { CronController } from './cron.controller';
import { DailySummaryService } from './daily-summary.service';

@Module({
  imports: [TelegramModule],
  controllers: [CronController],
  providers: [DailySummaryService],
})
export class CronModule {}
