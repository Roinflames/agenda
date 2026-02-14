import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SchedulesController } from './controllers/schedules.controller';
import { SchedulesService } from './services/schedules.service';

@Module({
  controllers: [SchedulesController],
  providers: [SchedulesService, PrismaService],
})
export class SchedulesModule {}
