import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccessService } from '../../access/access.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/update-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async list(requesterId: string, centerId: string) {
    await this.access.requireCenterMember(requesterId, centerId);
    const schedules = await this.prisma.classSchedule.findMany({
      where: { centerId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return { schedules };
  }

  async create(requesterId: string, dto: CreateScheduleDto) {
    await this.access.requireCenterRole(requesterId, dto.centerId, ['OWNER', 'ADMIN']);

    if (!/^\d{2}:\d{2}$/.test(dto.startTime) || !/^\d{2}:\d{2}$/.test(dto.endTime)) {
      throw new BadRequestException('Formato de hora inválido, usar HH:mm');
    }
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException('endTime debe ser mayor a startTime');
    }

    const schedule = await this.prisma.classSchedule.create({
      data: {
        centerId: dto.centerId,
        name: dto.name,
        description: dto.description,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        capacity: dto.capacity ?? 20,
        spaceId: dto.spaceId,
      },
    });
    return { schedule };
  }

  async update(requesterId: string, scheduleId: string, dto: UpdateScheduleDto) {
    const existing = await this.prisma.classSchedule.findUnique({ where: { id: scheduleId } });
    if (!existing) throw new NotFoundException('Horario no encontrado');

    await this.access.requireCenterRole(requesterId, existing.centerId, ['OWNER', 'ADMIN']);

    if (dto.startTime && !/^\d{2}:\d{2}$/.test(dto.startTime)) {
      throw new BadRequestException('Formato de hora inválido');
    }
    if (dto.endTime && !/^\d{2}:\d{2}$/.test(dto.endTime)) {
      throw new BadRequestException('Formato de hora inválido');
    }

    const schedule = await this.prisma.classSchedule.update({
      where: { id: scheduleId },
      data: {
        name: dto.name,
        description: dto.description,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        capacity: dto.capacity,
        isActive: dto.isActive,
        spaceId: dto.spaceId,
      },
    });
    return { schedule };
  }

  async remove(requesterId: string, scheduleId: string) {
    const existing = await this.prisma.classSchedule.findUnique({ where: { id: scheduleId } });
    if (!existing) throw new NotFoundException('Horario no encontrado');

    await this.access.requireCenterRole(requesterId, existing.centerId, ['OWNER']);
    await this.prisma.classSchedule.delete({ where: { id: scheduleId } });
    return { ok: true };
  }
}
