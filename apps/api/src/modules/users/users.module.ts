import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
})
export class UsersModule {}

