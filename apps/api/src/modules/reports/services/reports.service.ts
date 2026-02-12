import { Injectable } from '@nestjs/common';
import { AccessService } from '../../access/access.service';
import { PrismaService } from '../../prisma/prisma.service';

function parseRange(range: { from?: string; to?: string }) {
  const now = new Date();
  const from = range.from ? new Date(range.from) : new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
  const to = range.to ? new Date(range.to) : now;
  return { from, to };
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async income(requesterId: string, centerId: string, range: { from?: string; to?: string }) {
    await this.access.requireCenterRole(requesterId, centerId, ['OWNER', 'ADMIN', 'STAFF']);
    const { from, to } = parseRange(range);

    const payments = await this.prisma.payment.findMany({
      where: { centerId, status: 'PAID', createdAt: { gte: from, lte: to } },
      select: { createdAt: true, amountCents: true, currency: true },
      orderBy: { createdAt: 'asc' },
    });

    const byDay = new Map<string, number>();
    for (const p of payments) {
      const k = p.createdAt.toISOString().slice(0, 10);
      byDay.set(k, (byDay.get(k) ?? 0) + p.amountCents);
    }

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      series: Array.from(byDay.entries()).map(([day, revenueCents]) => ({ day, revenueCents })),
    };
  }

  async reservations(requesterId: string, centerId: string, range: { from?: string; to?: string }) {
    await this.access.requireCenterRole(requesterId, centerId, ['OWNER', 'ADMIN', 'STAFF']);
    const { from, to } = parseRange(range);

    const rows = await this.prisma.reservation.findMany({
      where: { centerId, startAt: { gte: from, lte: to } },
      select: { startAt: true, status: true },
      orderBy: { startAt: 'asc' },
    });

    const byDay = new Map<string, { confirmed: number; canceled: number }>();
    for (const r of rows) {
      const k = r.startAt.toISOString().slice(0, 10);
      const cur = byDay.get(k) ?? { confirmed: 0, canceled: 0 };
      if (r.status === 'CONFIRMED') cur.confirmed += 1;
      else cur.canceled += 1;
      byDay.set(k, cur);
    }

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      series: Array.from(byDay.entries()).map(([day, v]) => ({ day, ...v })),
    };
  }
}

