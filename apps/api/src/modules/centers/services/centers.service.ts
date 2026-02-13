import { BadRequestException, Injectable } from '@nestjs/common';
import { AccessService } from '../../access/access.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCenterDto } from '../dto/create-center.dto';
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
      const centers = await this.prisma.center.findMany({ orderBy: { createdAt: 'desc' } });
      return { centers };
    }

    const centers = await this.prisma.centerUser.findMany({
      where: { userId },
      include: { center: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      centers: centers.map((cu: {
        center: { id: string; name: string; slug: string; timezone: string; currency: string };
        role: string;
      }) => ({
        id: cu.center.id,
        name: cu.center.name,
        slug: cu.center.slug,
        timezone: cu.center.timezone,
        currency: cu.center.currency,
        role: cu.role,
      })),
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
    await this.access.requireCenterRole(userId, centerId, ['OWNER', 'ADMIN', 'STAFF']);

    const now = new Date();
    const from = range.from ? new Date(range.from) : new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
    const to = range.to ? new Date(range.to) : now;

    const [members, reservations, revenue] = await Promise.all([
      this.prisma.centerUser.count({ where: { centerId } }),
      this.prisma.reservation.count({ where: { centerId, startAt: { gte: from, lte: to } } }),
      this.prisma.payment.aggregate({
        where: { centerId, status: 'PAID', createdAt: { gte: from, lte: to } },
        _sum: { amountCents: true },
      }),
    ]);

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      metrics: {
        members,
        reservations,
        revenueCents: revenue._sum.amountCents ?? 0,
      },
    };
  }
}
