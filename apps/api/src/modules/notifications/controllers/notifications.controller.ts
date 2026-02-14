import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { JwtUser } from '../../auth/types/jwt-user.type';
import { CreateNotificationDto } from '../dto/create-notification.dto';
import { NotificationsService } from '../services/notifications.service';

@ApiTags('notificaciones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notificaciones')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(
    @CurrentUser() me: JwtUser,
    @Query('centerId') centerId: string,
    @Query('userId') userId?: string,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
  ) {
    return this.notifications.list(me.userId, centerId, { userId, channel, status });
  }

  @Post('enviar')
  async send(@CurrentUser() me: JwtUser, @Body() dto: CreateNotificationDto) {
    return this.notifications.send(me.userId, dto);
  }
}
