import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CenterMembershipRole = 'OWNER' | 'ADMIN' | 'STAFF' | 'MEMBER';

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async isSuperadmin(userId: string) {
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    return u?.role === 'SUPERADMIN';
  }

  async getCenterRole(userId: string, centerId: string): Promise<CenterMembershipRole | null> {
    if (await this.isSuperadmin(userId)) return 'OWNER';
    const cu = await this.prisma.centerUser.findUnique({
      where: { centerId_userId: { centerId, userId } },
      select: { role: true },
    });
    return cu?.role ?? null;
  }

  async requireCenterMember(userId: string, centerId: string) {
    const role = await this.getCenterRole(userId, centerId);
    if (!role) throw new ForbiddenException('No tienes acceso a este centro');
    return role;
  }

  async requireCenterRole(userId: string, centerId: string, roles: CenterMembershipRole[]) {
    const role = await this.requireCenterMember(userId, centerId);
    if (!roles.includes(role)) throw new ForbiddenException('Permisos insuficientes');
    return role;
  }

  async requireCenterExists(centerId: string) {
    const center = await this.prisma.center.findUnique({ where: { id: centerId } });
    if (!center) throw new NotFoundException('Centro no encontrado');
    return center;
  }
}
