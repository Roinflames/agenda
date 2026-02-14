import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtUser } from '../../auth/types/jwt-user.type';
import { CreateTimeBlockDto } from '../dto/create-time-block.dto';
import { UpdateTimeBlockDto } from '../dto/update-time-block.dto';
import { TimeBlocksService } from '../services/time-blocks.service';

@ApiTags('bloqueos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bloqueos')
export class TimeBlocksController {
  constructor(private readonly timeBlocks: TimeBlocksService) {}

  @Get()
  async list(
    @CurrentUser() me: JwtUser,
    @Query('centerId') centerId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.timeBlocks.list(me.userId, centerId, from, to);
  }

  @Post()
  async create(@CurrentUser() me: JwtUser, @Body() dto: CreateTimeBlockDto) {
    return this.timeBlocks.create(me.userId, dto);
  }

  @Put(':id')
  async update(@CurrentUser() me: JwtUser, @Param('id') id: string, @Body() dto: UpdateTimeBlockDto) {
    return this.timeBlocks.update(me.userId, id, dto);
  }

  @Delete(':id')
  async remove(@CurrentUser() me: JwtUser, @Param('id') id: string) {
    return this.timeBlocks.remove(me.userId, id);
  }
}
