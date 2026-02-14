import { Module } from '@nestjs/common';
import { AccessModule } from './modules/access/access.module';
import { AuthModule } from './modules/auth/auth.module';
import { CentersModule } from './modules/centers/centers.module';
import { HealthModule } from './modules/health/health.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { TimeBlocksModule } from './modules/time-blocks/time-blocks.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    PrismaModule,
    AccessModule,
    HealthModule,
    AuthModule,
    CentersModule,
    UsersModule,
    ReservationsModule,
    SchedulesModule,
    TimeBlocksModule,
    MembershipsModule,
    NotificationsModule,
    PaymentsModule,
    ReportsModule,
  ],
})
export class AppModule {}
