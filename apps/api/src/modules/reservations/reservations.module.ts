import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationsController } from './controllers/reservations.controller';
import { ReservationsService } from './services/reservations.service';

@Module({
  controllers: [ReservationsController],
  providers: [ReservationsService, PrismaService],
})
export class ReservationsModule {}

