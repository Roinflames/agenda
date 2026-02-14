import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TimeBlocksController } from './controllers/time-blocks.controller';
import { TimeBlocksService } from './services/time-blocks.service';

@Module({
  controllers: [TimeBlocksController],
  providers: [TimeBlocksService, PrismaService],
})
export class TimeBlocksModule {}
