import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ActivityModule } from './modules/activity/activity.module';
import { AuthModule } from './modules/auth/auth.module';
import { CronModule } from './modules/cron/cron.module';
import { CustomersModule } from './modules/customers/customers.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { HealthModule } from './modules/health/health.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductsModule } from './modules/products/products.module';
import { PromoModule } from './modules/promo/promo.module';
import { ReportsModule } from './modules/reports/reports.module';
import { StoresModule } from './modules/stores/stores.module';
import { TeamModule } from './modules/team/team.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HealthModule,
    AuthModule,
    StoresModule,
    CustomersModule,
    ProductsModule,
    PromoModule,
    OrdersModule,
    InventoryModule,
    ReportsModule,
    TeamModule,
    DashboardModule,
    TelegramModule,
    ActivityModule,
    CronModule,
  ],
})
export class AppModule {}
