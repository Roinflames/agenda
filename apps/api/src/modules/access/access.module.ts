import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from './access.service';

@Global()
@Module({
  providers: [AccessService, PrismaService],
  exports: [AccessService],
})
export class AccessModule {}

