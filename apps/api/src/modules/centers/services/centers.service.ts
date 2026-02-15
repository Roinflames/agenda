import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AccessService } from '../../access/access.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCenterDto } from '../dto/create-center.dto';
import { UpdateCenterServiceStatusDto } from '../dto/update-center-service-status.dto';
import { UpdateCenterDto } from '../dto/update-center.dto';

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class CentersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async listForUser(userId: string) {
    if (await this.access.isSuperadmin(userId)) {
      const centers = await this.prisma.$queryRaw<Array<{
        id: string;
        name: string;
        slug: string;
        timezone: string;
        currency: string;
        serviceStatus: string;
        suspensionReason: string | null;
        suspendedAt: Date | null;
      }>>`
        SELECT
          "id",
          "name",
          "slug",
          "timezone",
          "currency",
          "serviceStatus"::text as "serviceStatus",
          "suspensionReason",
          "suspendedAt"
        FROM "Center"
        ORDER BY "createdAt" DESC
      `;
      return {
        centers: centers.map((c: any) => ({
          ...c,
          role: 'OWNER',
        })),
      };
    }

    const centers = await this.prisma.$queryRaw<Array<{
      id: string;
      name: string;
      slug: string;
      timezone: string;
      currency: string;
      role: string;
      serviceStatus: string;
      suspensionReason: string | null;
      suspendedAt: Date | null;
    }>>`
      SELECT
        c."id",
        c."name",
        c."slug",
        c."timezone",
        c."currency",
        cu."role"::text as "role",
        c."serviceStatus"::text as "serviceStatus",
        c."suspensionReason",
        c."suspendedAt"
      FROM "CenterUser" cu
      INNER JOIN "Center" c ON c."id" = cu."centerId"
      WHERE cu."userId" = ${userId}
      ORDER BY cu."createdAt" DESC
    `;

    return {
      centers,
    };
  }

  async create(userId: string, dto: CreateCenterDto) {
    const name = dto.name.trim();
    const slug = dto.slug?.trim() ? slugify(dto.slug) : slugify(name);
    if (!slug) throw new BadRequestException('Slug inválido');

    // Ensure uniqueness (simple suffix)
    const exists = await this.prisma.center.findUnique({ where: { slug } });
    const finalSlug = exists ? `${slug}-${userId.slice(0, 6)}` : slug;

    const center = await this.prisma.center.create({
      data: {
        name,
        slug: finalSlug,
        timezone: dto.timezone ?? 'UTC',
        currency: dto.currency ?? 'usd',
      },
    });
    await this.prisma.centerUser.create({
      data: { centerId: center.id, userId, role: 'OWNER' },
    });

    return { center };
  }

  async get(userId: string, centerId: string) {
    await this.access.requireCenterMember(userId, centerId);
    const center = await this.access.requireCenterExists(centerId);
    return { center };
  }

  async update(userId: string, centerId: string, dto: UpdateCenterDto) {
    await this.access.requireCenterRole(userId, centerId, ['OWNER', 'ADMIN']);
    const center = await this.prisma.center.update({
      where: { id: centerId },
      data: {
        name: dto.name?.trim(),
        timezone: dto.timezone,
        currency: dto.currency,
      },
    });
    return { center };
  }

  async remove(userId: string, centerId: string) {
    await this.access.requireCenterRole(userId, centerId, ['OWNER']);
    await this.prisma.center.delete({ where: { id: centerId } });
    return { ok: true };
  }

  async dashboard(userId: string, centerId: string, range: { from?: string; to?: string }) {
    const role = await this.access.requireCenterMember(userId, centerId);

    const now = new Date();
    const from = range.from ? new Date(range.from) : new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
    const to = range.to ? new Date(range.to) : now;

    if (role === 'MEMBER') {
      const reservations = await this.prisma.reservation.count({
        where: { centerId, userId, startAt: { gte: from, lte: to } },
      });

      return {
        scope: 'MEMBER',
        range: { from: from.toISOString(), to: to.toISOString() },
        metrics: {
          members: null,
          reservations,
          revenueCents: null,
        },
      };
    }

    const [members, reservations, revenue] = await Promise.all([
      this.prisma.centerUser.count({ where: { centerId } }),
      this.prisma.reservation.count({ where: { centerId, startAt: { gte: from, lte: to } } }),
      this.prisma.payment.aggregate({
        where: { centerId, status: 'PAID', createdAt: { gte: from, lte: to } },
        _sum: { amountCents: true },
      }),
    ]);

    return {
      scope: role,
      range: { from: from.toISOString(), to: to.toISOString() },
      metrics: {
        members,
        reservations,
        revenueCents: revenue._sum.amountCents ?? 0,
      },
    };
  }

  async listClientCentersForSuspension(userId: string) {
    const canManageClients = await this.access.isClientCenterManager(userId);
    if (!canManageClients) throw new ForbiddenException('Permisos insuficientes');
    const managerSlug = this.access.clientManagerCenterSlug();
    const centers = await this.prisma.$queryRaw<Array<{
      id: string;
      name: string;
      slug: string;
      serviceStatus: string;
      suspensionReason: string | null;
      suspendedAt: Date | null;
    }>>`
      SELECT
        c."id",
        c."name",
        c."slug",
        c."serviceStatus"::text as "serviceStatus",
        c."suspensionReason",
        c."suspendedAt"
      FROM "Center" c
      WHERE c."slug" <> ${managerSlug}
      ORDER BY c."name" ASC
    `;
    return { centers };
  }

  async updateServiceStatus(userId: string, centerId: string, dto: UpdateCenterServiceStatusDto) {
    const isSuperadmin = await this.access.isSuperadmin(userId);
    const role = await this.access.getCenterRole(userId, centerId);
    const isDirectOwner = role === 'OWNER';
    const isClientManager = await this.access.isClientCenterManager(userId);
    if (!isSuperadmin && !isDirectOwner) {
      if (!isClientManager) throw new ForbiddenException('Permisos insuficientes');
      const target = await this.access.requireCenterExists(centerId);
      if (target.slug === this.access.clientManagerCenterSlug()) {
        throw new ForbiddenException('No puedes suspender tu propio centro gestor');
      }
    }

    const nextStatus = dto.serviceStatus;
    const reason = dto.suspensionReason?.trim();
    const nextReason = nextStatus === 'SUSPENDED' ? (reason || 'Mensualidad pendiente de pago') : null;
    const nextSuspendedAt = nextStatus === 'SUSPENDED' ? new Date() : null;
    await this.prisma.$executeRaw(
      Prisma.sql`UPDATE "Center"
                 SET "serviceStatus" = CAST(${nextStatus} AS "CenterServiceStatus"),
                     "suspensionReason" = ${nextReason},
                     "suspendedAt" = ${nextSuspendedAt},
                     "updatedAt" = NOW()
                 WHERE "id" = ${centerId}`,
    );
    const rows = await this.prisma.$queryRaw<Array<{
      id: string;
      name: string;
      slug: string;
      timezone: string;
      currency: string;
      serviceStatus: string;
      suspensionReason: string | null;
      suspendedAt: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }>>`
      SELECT
        "id",
        "name",
        "slug",
        "timezone",
        "currency",
        "serviceStatus"::text as "serviceStatus",
        "suspensionReason",
        "suspendedAt",
        "createdAt",
        "updatedAt"
      FROM "Center"
      WHERE "id" = ${centerId}
      LIMIT 1
    `;
    const center = rows[0];
    return { center };
  }
}
