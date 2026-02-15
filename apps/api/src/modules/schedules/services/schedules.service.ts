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

  private parseTimeMinutes(time: string) {
    if (!/^\d{2}:\d{2}$/.test(time)) {
      throw new BadRequestException('Formato de hora inválido, usar HH:mm');
    }
    const [h, m] = time.split(':').map(Number);
    if (h < 0 || h > 23 || m < 0 || m > 59) {
      throw new BadRequestException('Hora fuera de rango');
    }
    return h * 60 + m;
  }

  private validateBusinessRules(startTime: string, endTime: string, capacity: number | null | undefined) {
    const start = this.parseTimeMinutes(startTime);
    const end = this.parseTimeMinutes(endTime);

    if (end - start !== 60) {
      throw new BadRequestException('Cada bloque de clase debe durar exactamente 1 hora');
    }
    if (start < 18 * 60 || end > 21 * 60) {
      throw new BadRequestException('Horario permitido: 18:00 a 21:00');
    }

    const cap = capacity ?? 20;
    if (![2, 3].includes(cap)) {
      throw new BadRequestException('Capacidad permitida: 2 o 3 camas');
    }
  }

  async list(requesterId: string, centerId: string) {
    await this.access.requireCenterMember(requesterId, centerId);
    const schedules = await this.prisma.classSchedule.findMany({
      where: { centerId },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
    return { schedules };
  }

  async create(requesterId: string, dto: CreateScheduleDto) {
    await this.access.requireCenterRole(requesterId, dto.centerId, ['OWNER', 'ADMIN', 'STAFF']);
    this.validateBusinessRules(dto.startTime, dto.endTime, dto.capacity ?? 20);

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

    await this.access.requireCenterRole(requesterId, existing.centerId, ['OWNER', 'ADMIN', 'STAFF']);
    const nextStart = dto.startTime ?? existing.startTime;
    const nextEnd = dto.endTime ?? existing.endTime;
    const nextCapacity = dto.capacity ?? existing.capacity;
    this.validateBusinessRules(nextStart, nextEnd, nextCapacity);

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

    await this.access.requireCenterRole(requesterId, existing.centerId, ['OWNER', 'ADMIN', 'STAFF']);
    await this.prisma.classSchedule.delete({ where: { id: scheduleId } });
    return { ok: true };
  }
}
