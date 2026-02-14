import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtUser } from '../../auth/types/jwt-user.type';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/update-schedule.dto';
import { SchedulesService } from '../services/schedules.service';

@ApiTags('horarios')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('horarios')
export class SchedulesController {
  constructor(private readonly schedules: SchedulesService) {}

  @Get()
  async list(@CurrentUser() me: JwtUser, @Query('centerId') centerId: string) {
    return this.schedules.list(me.userId, centerId);
  }

  @Post()
  async create(@CurrentUser() me: JwtUser, @Body() dto: CreateScheduleDto) {
    return this.schedules.create(me.userId, dto);
  }

  @Put(':id')
  async update(@CurrentUser() me: JwtUser, @Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.schedules.update(me.userId, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() me: JwtUser, @Param('id') id: string) {
    return this.schedules.remove(me.userId, id);
  }
}
