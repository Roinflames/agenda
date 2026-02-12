import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtUser } from '../../auth/types/jwt-user.type';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UsersService } from '../services/users.service';

@ApiTags('usuarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('usuarios')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  async list(@CurrentUser() me: JwtUser, @Query('centerId') centerId: string) {
    return this.users.list(me.userId, centerId);
  }

  @Post()
  async create(@CurrentUser() me: JwtUser, @Body() dto: CreateUserDto) {
    return this.users.create(me.userId, dto);
  }

  @Put(':id')
  async update(@CurrentUser() me: JwtUser, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(me.userId, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() me: JwtUser, @Param('id') id: string, @Query('centerId') centerId: string) {
    return this.users.removeFromCenter(me.userId, id, centerId);
  }

  @Get(':id/reservas')
  async reservations(
    @CurrentUser() me: JwtUser,
    @Param('id') userId: string,
    @Query('centerId') centerId: string,
  ) {
    return this.users.reservations(me.userId, centerId, userId);
  }
}

