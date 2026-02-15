import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtUser } from '../../auth/types/jwt-user.type';
import { AssignMembershipDto } from '../dto/assign-membership.dto';
import { ChangeOwnMembershipDto } from '../dto/change-own-membership.dto';
import { MembershipsService } from '../services/memberships.service';

@ApiTags('membresias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('membresias')
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Post('asignar')
  async assign(@CurrentUser() me: JwtUser, @Body() dto: AssignMembershipDto) {
    return this.memberships.assign(me.userId, dto);
  }

  @Get('actual')
  async current(@CurrentUser() me: JwtUser, @Query('centerId') centerId: string) {
    return this.memberships.currentForMe(me.userId, centerId);
  }

  @Post('cambiar-plan')
  async changeOwnPlan(@CurrentUser() me: JwtUser, @Body() dto: ChangeOwnMembershipDto) {
    return this.memberships.changeOwnPlan(me.userId, dto);
  }

  @Get('pagos')
  async paymentHistory(
    @CurrentUser() me: JwtUser,
    @Query('centerId') centerId: string,
    @Query('userId') userId?: string,
  ) {
    return this.memberships.paymentHistory(me.userId, centerId, { userId });
  }
}
