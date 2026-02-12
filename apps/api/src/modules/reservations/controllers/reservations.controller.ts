import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtUser } from '../../auth/types/jwt-user.type';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';
import { ReservationsService } from '../services/reservations.service';

@ApiTags('reservas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reservas')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Get()
  async list(
    @CurrentUser() me: JwtUser,
    @Query('centerId') centerId: string,
    @Query('userId') userId?: string,
  ) {
    return this.reservations.list(me.userId, centerId, { userId });
  }

  @Post()
  async create(@CurrentUser() me: JwtUser, @Body() dto: CreateReservationDto) {
    return this.reservations.create(me.userId, dto);
  }

  @Put(':id')
  async update(@CurrentUser() me: JwtUser, @Param('id') id: string, @Body() dto: UpdateReservationDto) {
    return this.reservations.update(me.userId, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() me: JwtUser, @Param('id') id: string) {
    return this.reservations.remove(me.userId, id);
  }
}

