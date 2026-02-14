import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccessService } from '../../access/access.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTimeBlockDto } from '../dto/create-time-block.dto';
import { UpdateTimeBlockDto } from '../dto/update-time-block.dto';

@Injectable()
export class TimeBlocksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async list(requesterId: string, centerId: string, from?: string, to?: string) {
    await this.access.requireCenterMember(requesterId, centerId);

    const where: any = { centerId };
    if (from) where.startAt = { ...(where.startAt || {}), gte: new Date(from) };
    if (to) where.endAt = { ...(where.endAt || {}), lte: new Date(to) };

    const blocks = await this.prisma.timeBlock.findMany({
      where,
      orderBy: { startAt: 'asc' },
    });
    return { blocks };
  }

  async create(requesterId: string, dto: CreateTimeBlockDto) {
    await this.access.requireCenterRole(requesterId, dto.centerId, ['OWNER', 'ADMIN']);

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (isNaN(startAt.getTime())) throw new BadRequestException('startAt inválido');
    if (isNaN(endAt.getTime())) throw new BadRequestException('endAt inválido');
    if (endAt <= startAt) throw new BadRequestException('endAt debe ser mayor a startAt');

    const block = await this.prisma.timeBlock.create({
      data: {
        centerId: dto.centerId,
        name: dto.name,
        startAt,
        endAt,
      },
    });
    return { block };
  }

  async update(requesterId: string, blockId: string, dto: UpdateTimeBlockDto) {
    const existing = await this.prisma.timeBlock.findUnique({ where: { id: blockId } });
    if (!existing) throw new NotFoundException('Bloqueo no encontrado');

    await this.access.requireCenterRole(requesterId, existing.centerId, ['OWNER', 'ADMIN']);

    const startAt = dto.startAt ? new Date(dto.startAt) : undefined;
    const endAt = dto.endAt ? new Date(dto.endAt) : undefined;
    if (startAt && isNaN(startAt.getTime())) throw new BadRequestException('startAt inválido');
    if (endAt && isNaN(endAt.getTime())) throw new BadRequestException('endAt inválido');

    const finalStart = startAt ?? existing.startAt;
    const finalEnd = endAt ?? existing.endAt;
    if (finalEnd <= finalStart) throw new BadRequestException('endAt debe ser mayor a startAt');

    const block = await this.prisma.timeBlock.update({
      where: { id: blockId },
      data: { name: dto.name, startAt, endAt },
    });
    return { block };
  }

  async remove(requesterId: string, blockId: string) {
    const existing = await this.prisma.timeBlock.findUnique({ where: { id: blockId } });
    if (!existing) throw new NotFoundException('Bloqueo no encontrado');

    await this.access.requireCenterRole(requesterId, existing.centerId, ['OWNER', 'ADMIN']);
    await this.prisma.timeBlock.delete({ where: { id: blockId } });
    return { ok: true };
  }
}
