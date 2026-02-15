import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CenterMembershipRole = 'OWNER' | 'ADMIN' | 'STAFF' | 'MEMBER';
type AccessOptions = { allowSuspended?: boolean };

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  clientManagerCenterSlug() {
    return process.env.CLIENT_MANAGER_CENTER_SLUG ?? 'comunidad-virtual-demo';
  }

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

  async isClientCenterManager(userId: string) {
    if (await this.isSuperadmin(userId)) return true;
    const slug = this.clientManagerCenterSlug();
    const manager = await this.prisma.centerUser.findFirst({
      where: {
        userId,
        role: 'OWNER',
        center: { slug },
      },
      select: { id: true },
    });
    return Boolean(manager);
  }

  async requireCenterMember(userId: string, centerId: string, options: AccessOptions = {}) {
    const role = await this.getCenterRole(userId, centerId);
    if (!role) throw new ForbiddenException('No tienes acceso a este centro');
    if (!options.allowSuspended) {
      const rows = await this.prisma.$queryRaw<Array<{ serviceStatus: string }>>`
        SELECT "serviceStatus"::text as "serviceStatus"
        FROM "Center"
        WHERE "id" = ${centerId}
        LIMIT 1
      `;
      if (!rows[0]) throw new NotFoundException('Centro no encontrado');
      if (rows[0].serviceStatus === 'SUSPENDED') {
        throw new ForbiddenException('Servicio del centro suspendido por falta de pago');
      }
    }
    return role;
  }

  async requireCenterRole(userId: string, centerId: string, roles: CenterMembershipRole[], options: AccessOptions = {}) {
    const role = await this.requireCenterMember(userId, centerId, options);
    if (!roles.includes(role)) throw new ForbiddenException('Permisos insuficientes');
    return role;
  }

  async requireCenterExists(centerId: string) {
    const center = await this.prisma.center.findUnique({ where: { id: centerId } });
    if (!center) throw new NotFoundException('Centro no encontrado');
    return center;
  }
}
