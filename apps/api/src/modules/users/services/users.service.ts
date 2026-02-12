import { BadRequestException, Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { AccessService } from '../../access/access.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async list(requesterId: string, centerId: string) {
    await this.access.requireCenterRole(requesterId, centerId, ['OWNER', 'ADMIN', 'STAFF']);
    const users = await this.prisma.centerUser.findMany({
      where: { centerId },
      include: { user: { select: { id: true, email: true, name: true, phone: true, createdAt: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return { users: users.map((cu) => ({ ...cu.user, role: cu.role })) };
  }

  async create(requesterId: string, dto: CreateUserDto) {
    await this.access.requireCenterRole(requesterId, dto.centerId, ['OWNER', 'ADMIN']);
    if (dto.role === 'OWNER') throw new BadRequestException('No se puede asignar OWNER desde este endpoint');

    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      // If already exists, just add to center
      const cu = await this.prisma.centerUser.upsert({
        where: { centerId_userId: { centerId: dto.centerId, userId: existing.id } },
        create: { centerId: dto.centerId, userId: existing.id, role: dto.role ?? 'MEMBER' },
        update: { role: dto.role ?? 'MEMBER' },
      });
      return { userId: existing.id, centerUserId: cu.id };
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, name: dto.name, phone: dto.phone },
    });
    const cu = await this.prisma.centerUser.create({
      data: { centerId: dto.centerId, userId: user.id, role: dto.role ?? 'MEMBER' },
    });

    return { userId: user.id, centerUserId: cu.id };
  }

  async update(requesterId: string, targetUserId: string, dto: UpdateUserDto) {
    await this.access.requireCenterRole(requesterId, dto.centerId, ['OWNER', 'ADMIN']);
    if (dto.role === 'OWNER') throw new BadRequestException('No se puede asignar OWNER desde este endpoint');

    const user = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { name: dto.name, phone: dto.phone },
      select: { id: true, email: true, name: true, phone: true },
    });

    if (dto.role) {
      await this.prisma.centerUser.update({
        where: { centerId_userId: { centerId: dto.centerId, userId: targetUserId } },
        data: { role: dto.role },
      });
    }

    return { user };
  }

  async removeFromCenter(requesterId: string, targetUserId: string, centerId: string) {
    await this.access.requireCenterRole(requesterId, centerId, ['OWNER', 'ADMIN']);
    await this.prisma.centerUser.delete({ where: { centerId_userId: { centerId, userId: targetUserId } } });
    return { ok: true };
  }

  async reservations(requesterId: string, centerId: string, userId: string) {
    const role = await this.access.requireCenterMember(requesterId, centerId);
    if (role === 'MEMBER' && requesterId !== userId) {
      throw new BadRequestException('Solo puedes ver tus reservas');
    }
    const reservations = await this.prisma.reservation.findMany({
      where: { centerId, userId },
      orderBy: { startAt: 'desc' },
    });
    return { reservations };
  }
}

