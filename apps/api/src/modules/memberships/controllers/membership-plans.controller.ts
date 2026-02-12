import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtUser } from '../../auth/types/jwt-user.type';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';
import { MembershipsService } from '../services/memberships.service';

@ApiTags('membresias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('membresias/planes')
export class MembershipPlansController {
  constructor(private readonly memberships: MembershipsService) {}

  @Get()
  async list(@CurrentUser() me: JwtUser, @Query('centerId') centerId: string) {
    return this.memberships.listPlans(me.userId, centerId);
  }

  @Post()
  async create(@CurrentUser() me: JwtUser, @Body() dto: CreatePlanDto) {
    return this.memberships.createPlan(me.userId, dto);
  }

  @Put(':id')
  async update(@CurrentUser() me: JwtUser, @Param('id') id: string, @Query('centerId') centerId: string, @Body() dto: UpdatePlanDto) {
    return this.memberships.updatePlan(me.userId, centerId, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() me: JwtUser, @Param('id') id: string, @Query('centerId') centerId: string) {
    return this.memberships.removePlan(me.userId, centerId, id);
  }
}

