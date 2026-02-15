import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AccessService } from '../../access/access.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async list(requesterId: string, centerId: string, filter: { userId?: string }) {
    const role = await this.access.requireCenterMember(requesterId, centerId);
    const requestedUserId = filter.userId;

    if (requestedUserId && role === 'MEMBER' && requestedUserId !== requesterId) {
      throw new ForbiddenException('No puedes ver reservas de otros usuarios');
    }

    const where: any = { centerId };
    if (role === 'MEMBER') {
      where.userId = requesterId;
    } else if (role === 'STAFF') {
      if (requestedUserId && requestedUserId !== requesterId) {
        where.userId = requestedUserId;
        where.staffId = requesterId;
      } else {
        where.OR = [{ userId: requesterId }, { staffId: requesterId }];
      }
    } else if (requestedUserId) {
      where.userId = requestedUserId;
    }

    const reservations = await this.prisma.reservation.findMany({
      where,
      orderBy: { startAt: 'desc' },
    });
    return { reservations };
  }

  async create(requesterId: string, dto: CreateReservationDto) {
    const role = await this.access.requireCenterMember(requesterId, dto.centerId);
    const userId = dto.userId ?? requesterId;

    if (role === 'MEMBER' && userId !== requesterId) {
      throw new ForbiddenException('No puedes reservar para otro usuario');
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (!(startAt instanceof Date) || isNaN(startAt.getTime())) throw new BadRequestException('startAt inválido');
    if (!(endAt instanceof Date) || isNaN(endAt.getTime())) throw new BadRequestException('endAt inválido');
    if (endAt <= startAt) throw new BadRequestException('endAt debe ser > startAt');

    // Evitar duplicado exacto de un usuario en misma clase/horario.
    const duplicate = await this.prisma.reservation.findFirst({
      where: {
        centerId: dto.centerId,
        userId,
        scheduleId: dto.scheduleId ?? undefined,
        startAt,
        endAt,
        status: 'CONFIRMED',
      },
    });
    if (duplicate) throw new BadRequestException('Ya tienes una reserva para ese horario');

    // Basic overlap protection: same center + same space (if any)
    if (dto.spaceId) {
      const overlap = await this.prisma.reservation.findFirst({
        where: {
          centerId: dto.centerId,
          spaceId: dto.spaceId,
          status: 'CONFIRMED',
          OR: [
            { startAt: { lt: endAt }, endAt: { gt: startAt } },
          ],
        },
      });
      if (overlap) throw new BadRequestException('Horario no disponible');
    }

    // Validar conflictos con bloqueos de tiempo
    const timeBlockConflict = await this.prisma.timeBlock.findFirst({
      where: {
        centerId: dto.centerId,
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
    });
    if (timeBlockConflict) throw new BadRequestException('Horario bloqueado');

    // Validar capacidad si se asocia a un horario de clase.
    if (dto.scheduleId) {
      const schedule = await this.prisma.classSchedule.findUnique({
        where: { id: dto.scheduleId },
      });
      if (!schedule) throw new BadRequestException('Horario de clase no encontrado');

      const confirmedCount = await this.prisma.reservation.count({
        where: {
          scheduleId: dto.scheduleId,
          status: 'CONFIRMED',
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      });
      if (confirmedCount >= schedule.capacity) {
        throw new BadRequestException('Clase llena');
      }
    }

    const center = await this.access.requireCenterExists(dto.centerId);

    const reservation = await this.prisma.reservation.create({
      data: {
        centerId: dto.centerId,
        userId,
        staffId: role === 'STAFF' ? requesterId : null,
        kind: dto.kind,
        title: dto.title,
        spaceId: dto.spaceId,
        scheduleId: dto.scheduleId,
        startAt,
        endAt,
        status: 'CONFIRMED',
        priceCents: dto.priceCents ?? 0,
        currency: dto.currency ?? center.currency,
      },
    });

    return { reservation };
  }

  async update(requesterId: string, reservationId: string, dto: UpdateReservationDto) {
    const existing = await this.prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!existing) throw new NotFoundException('Reserva no encontrada');

    const role = await this.access.requireCenterMember(requesterId, existing.centerId);
    if (role === 'MEMBER' && existing.userId !== requesterId) {
      throw new ForbiddenException('No puedes modificar reservas de otros usuarios');
    }
    if (role === 'STAFF' && existing.userId !== requesterId && existing.staffId !== requesterId) {
      throw new ForbiddenException('No puedes modificar reservas no asignadas a ti');
    }

    const startAt = dto.startAt ? new Date(dto.startAt) : undefined;
    const endAt = dto.endAt ? new Date(dto.endAt) : undefined;
    if (startAt && isNaN(startAt.getTime())) throw new BadRequestException('startAt inválido');
    if (endAt && isNaN(endAt.getTime())) throw new BadRequestException('endAt inválido');

    const updated = await this.prisma.reservation.update({
      where: { id: reservationId },
      data: {
        title: dto.title,
        startAt,
        endAt,
        status: dto.status,
      },
    });
    return { reservation: updated };
  }

  async remove(requesterId: string, reservationId: string) {
    const existing = await this.prisma.reservation.findUnique({ where: { id: reservationId } });
    if (!existing) throw new NotFoundException('Reserva no encontrada');

    const role = await this.access.requireCenterMember(requesterId, existing.centerId);
    if (role === 'MEMBER' && existing.userId !== requesterId) {
      throw new ForbiddenException('No puedes eliminar reservas de otros usuarios');
    }
    if (role === 'STAFF' && existing.userId !== requesterId && existing.staffId !== requesterId) {
      throw new ForbiddenException('No puedes eliminar reservas no asignadas a ti');
    }

    // Delete per requirement; for audit, you'd soft-cancel.
    await this.prisma.reservation.delete({ where: { id: reservationId } });
    return { ok: true };
  }
}
