import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipPlansController } from './controllers/membership-plans.controller';
import { MembershipsController } from './controllers/memberships.controller';
import { MembershipsService } from './services/memberships.service';

@Module({
  controllers: [MembershipPlansController, MembershipsController],
  providers: [MembershipsService, PrismaService],
})
export class MembershipsModule {}

