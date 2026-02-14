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

  async agenda(requesterId: string, centerId: string, range: { from?: string; to?: string }) {
    await this.access.requireCenterRole(requesterId, centerId, ['OWNER', 'ADMIN', 'STAFF']);
    const { from, to } = parseRange(range);

    const [reservations, schedules] = await Promise.all([
      this.prisma.reservation.findMany({
        where: { centerId, startAt: { gte: from, lte: to } },
        select: { status: true, kind: true, title: true, startAt: true, scheduleId: true },
      }),
      this.prisma.classSchedule.findMany({
        where: { centerId },
        select: { id: true, name: true, capacity: true },
      }),
    ]);

    const totals = {
      total: reservations.length,
      confirmed: 0,
      canceled: 0,
      classes: 0,
      spaces: 0,
    };

    const weekdayNames = ['Domingo', 'Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado'];
    const byWeekday = weekdayNames.map((day, index) => ({ day, index, confirmed: 0, canceled: 0 }));
    const byClass = new Map<string, { scheduleId: string | null; name: string; confirmed: number; canceled: number }>();
    const scheduleCapacities = new Map(schedules.map((s) => [s.id, { name: s.name, capacity: s.capacity }]));

    for (const reservation of reservations) {
      if (reservation.kind === 'CLASS') totals.classes += 1;
      if (reservation.kind === 'SPACE') totals.spaces += 1;

      const weekday = reservation.startAt.getUTCDay();
      if (reservation.status === 'CONFIRMED') {
        totals.confirmed += 1;
        byWeekday[weekday].confirmed += 1;
      } else {
        totals.canceled += 1;
        byWeekday[weekday].canceled += 1;
      }

      if (reservation.kind !== 'CLASS') continue;
      const className = reservation.scheduleId
        ? (scheduleCapacities.get(reservation.scheduleId)?.name ?? reservation.title)
        : reservation.title;
      const key = reservation.scheduleId ?? `title:${className}`;
      const current = byClass.get(key) ?? {
        scheduleId: reservation.scheduleId ?? null,
        name: className,
        confirmed: 0,
        canceled: 0,
      };
      if (reservation.status === 'CONFIRMED') current.confirmed += 1;
      else current.canceled += 1;
      byClass.set(key, current);
    }

    const topClasses = Array.from(byClass.values())
      .map((item) => {
        const capacity = item.scheduleId ? (scheduleCapacities.get(item.scheduleId)?.capacity ?? null) : null;
        const occupancyPct = capacity && capacity > 0 ? Math.min(100, Math.round((item.confirmed / capacity) * 100)) : null;
        return {
          ...item,
          total: item.confirmed + item.canceled,
          occupancyPct,
        };
      })
      .sort((a, b) => b.confirmed - a.confirmed || b.total - a.total)
      .slice(0, 5);

    const cancellationRatePct = totals.total > 0 ? Number(((totals.canceled / totals.total) * 100).toFixed(1)) : 0;

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      totals: { ...totals, cancellationRatePct },
      byWeekday: byWeekday.sort((a, b) => a.index - b.index),
      topClasses,
    };
  }
}
