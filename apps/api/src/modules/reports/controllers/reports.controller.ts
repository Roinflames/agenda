import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtUser } from '../../auth/types/jwt-user.type';
import { ReportsService } from '../services/reports.service';

@ApiTags('reportes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reportes')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('ingresos')
  async ingresos(
    @CurrentUser() me: JwtUser,
    @Query('centerId') centerId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.income(me.userId, centerId, { from, to });
  }

  @Get('reservas')
  async reservas(
    @CurrentUser() me: JwtUser,
    @Query('centerId') centerId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.reservations(me.userId, centerId, { from, to });
  }
}

