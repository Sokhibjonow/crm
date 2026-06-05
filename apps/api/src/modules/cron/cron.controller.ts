import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Logger,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DailySummaryService } from './daily-summary.service';

/**
 * Cron endpoints triggered by Vercel's scheduler (see apps/api/vercel.json
 * "crons"). Vercel attaches `Authorization: Bearer $CRON_SECRET` when
 * CRON_SECRET is set on the project — we verify that.
 *
 * Both GET (Vercel cron pings GET) and POST are accepted so the same URL
 * can be triggered manually from curl/Postman during testing.
 */
@Controller('cron')
export class CronController {
  private readonly logger = new Logger(CronController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly dailySummary: DailySummaryService,
  ) {}

  @Get('daily-summary')
  @Post('daily-summary')
  async dailySummaryRun(@Headers('authorization') auth?: string) {
    this.assertAuthorized(auth);
    const t0 = Date.now();
    const result = await this.dailySummary.runYesterday();
    this.logger.log(
      `daily-summary stores=${result.storesProcessed} sent=${result.messagesSent} failed=${result.messagesFailed} ms=${Date.now() - t0}`,
    );
    return { ok: true, ...result };
  }

  private assertAuthorized(authHeader: string | undefined): void {
    const secret = this.config.get<string>('CRON_SECRET');
    // If CRON_SECRET isn't set, fail closed in production but open locally.
    // Vercel always sets the env if the user configured it, so this catches
    // accidental "forgot to add the secret" deploys.
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        throw new ForbiddenException('CRON_SECRET is not configured');
      }
      return;
    }
    const expected = `Bearer ${secret}`;
    if (authHeader !== expected) {
      throw new ForbiddenException('Bad cron auth');
    }
  }
}
