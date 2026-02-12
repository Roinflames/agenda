import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtUser } from '../../auth/types/jwt-user.type';
import { CreateCenterDto } from '../dto/create-center.dto';
import { UpdateCenterDto } from '../dto/update-center.dto';
import { CentersService } from '../services/centers.service';

@ApiTags('centros')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('centros')
export class CentersController {
  constructor(private readonly centers: CentersService) {}

  @Get()
  async list(@CurrentUser() user: JwtUser) {
    return this.centers.listForUser(user.userId);
  }

  @Post()
  async create(@CurrentUser() user: JwtUser, @Body() dto: CreateCenterDto) {
    return this.centers.create(user.userId, dto);
  }

  @Get(':id')
  async get(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.centers.get(user.userId, id);
  }

  @Put(':id')
  async update(@CurrentUser() user: JwtUser, @Param('id') id: string, @Body() dto: UpdateCenterDto) {
    return this.centers.update(user.userId, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.centers.remove(user.userId, id);
  }

  @Get(':id/dashboard')
  async dashboard(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.centers.dashboard(user.userId, id, { from, to });
  }
}

