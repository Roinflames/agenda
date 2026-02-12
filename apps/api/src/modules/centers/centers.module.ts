import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CentersController } from './controllers/centers.controller';
import { CentersService } from './services/centers.service';

@Module({
  controllers: [CentersController],
  providers: [CentersService, PrismaService],
})
export class CentersModule {}

