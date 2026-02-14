import { BadRequestException, Injectable } from '@nestjs/common';
import { NotificationChannel, NotificationStatus } from '@prisma/client';
import { AccessService } from '../../access/access.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async list(
    requesterId: string,
    centerId: string,
    filters: { userId?: string; channel?: string; status?: string },
  ) {
    await this.access.requireCenterRole(requesterId, centerId, ['OWNER', 'ADMIN', 'STAFF']);

    const channel = filters.channel as NotificationChannel | undefined;
    const status = filters.status as NotificationStatus | undefined;
    if (channel && !['EMAIL', 'PUSH'].includes(channel)) throw new BadRequestException('channel invalido');
    if (status && !['PENDING', 'SENT', 'FAILED'].includes(status)) throw new BadRequestException('status invalido');

    const notifications = await this.prisma.notification.findMany({
      where: {
        centerId,
        userId: filters.userId,
        channel,
        status,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return { notifications };
  }

  async send(requesterId: string, dto: CreateNotificationDto) {
    await this.access.requireCenterRole(requesterId, dto.centerId, ['OWNER', 'ADMIN', 'STAFF']);

    const centerUser = await this.prisma.centerUser.findUnique({
      where: { centerId_userId: { centerId: dto.centerId, userId: dto.userId } },
      include: { user: { select: { email: true, phone: true } } },
    });
    if (!centerUser) throw new BadRequestException('Usuario no pertenece al centro');

    const base = await this.prisma.notification.create({
      data: {
        centerId: dto.centerId,
        userId: dto.userId,
        channel: dto.channel,
        title: dto.title,
        message: dto.message,
        status: 'PENDING',
      },
    });

    let status: NotificationStatus = 'SENT';
    let error: string | null = null;

    if (dto.channel === 'EMAIL' && !centerUser.user.email) {
      status = 'FAILED';
      error = 'Usuario sin email';
    }

    if (dto.channel === 'PUSH' && !centerUser.user.phone) {
      status = 'FAILED';
      error = 'Usuario sin telefono/token push';
    }

    const notification = await this.prisma.notification.update({
      where: { id: base.id },
      data: {
        status,
        error,
        sentAt: status === 'SENT' ? new Date() : null,
        metadata: {
          simulated: true,
          provider: dto.channel === 'EMAIL' ? 'dev-email' : 'dev-push',
        },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return { notification };
  }
}
