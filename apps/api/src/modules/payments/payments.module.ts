import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsController } from './controllers/payments.controller';
import { PaymentsService } from './services/payments.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService],
})
export class PaymentsModule {}

