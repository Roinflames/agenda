import { Injectable } from '@nestjs/common';
import { AccessService } from '../../access/access.service';
import { PrismaService } from '../../prisma/prisma.service';

function parseRange(range: { from?: string; to?: string }) {
  const now = new Date();
  const from = range.from ? new Date(range.from) : new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);
  const to = range.to ? new Date(range.to) : now;
  return { from, to };
}

function monthStart(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
}

function monthEnd(year: number, monthIndex: number) {
  return new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
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

  async business(
    requesterId: string,
    centerId: string,
    params: { year?: string; from?: string; to?: string },
  ) {
    await this.access.requireCenterRole(requesterId, centerId, ['OWNER', 'ADMIN', 'STAFF']);

    const now = new Date();
    const currentYear = Number(params.year) || now.getUTCFullYear();
    const previousYear = currentYear - 1;
    const currentFrom = params.from ? new Date(params.from) : monthStart(currentYear, 0);
    const currentTo = params.to ? new Date(params.to) : monthEnd(currentYear, 11);
    const previousFrom = new Date(currentFrom);
    previousFrom.setUTCFullYear(previousFrom.getUTCFullYear() - 1);
    const previousTo = new Date(currentTo);
    previousTo.setUTCFullYear(previousTo.getUTCFullYear() - 1);
    const compareFrom = previousFrom < currentFrom ? previousFrom : currentFrom;
    const compareTo = previousTo > currentTo ? previousTo : currentTo;

    const [
      payments,
      members,
      yearlyReservations,
    ] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          centerId,
          status: 'PAID',
          createdAt: { gte: compareFrom, lte: compareTo },
        },
        select: { createdAt: true, amountCents: true },
      }),
      this.prisma.centerUser.findMany({
        where: { centerId, role: 'MEMBER' },
        select: {
          userId: true,
          status: true,
          user: { select: { name: true, email: true } },
        },
      }),
      this.prisma.reservation.findMany({
        where: {
          centerId,
          status: 'CONFIRMED',
          startAt: { gte: monthStart(currentYear, 0), lte: monthEnd(currentYear, 11) },
        },
        select: { userId: true, startAt: true },
      }),
    ]);

    const memberUserIds = members.map((m) => m.userId);
    const memberStatusByUserId = new Map(members.map((m) => [m.userId, m.status]));
    const activeMemberships = memberUserIds.length > 0
      ? await this.prisma.membership.findMany({
          where: { centerId, status: 'ACTIVE', userId: { in: memberUserIds } },
          include: {
            user: { select: { id: true, name: true, email: true } },
            plan: { select: { name: true, interval: true, currency: true } },
          },
          orderBy: [{ endsAt: 'asc' }, { startedAt: 'asc' }],
        })
      : [];

    const monthlyCurrent = Array.from({ length: 12 }, () => 0);
    const monthlyPrevious = Array.from({ length: 12 }, () => 0);
    let currentPeriodTotalCents = 0;
    let previousPeriodTotalCents = 0;

    for (const p of payments) {
      const y = p.createdAt.getUTCFullYear();
      const m = p.createdAt.getUTCMonth();
      const t = p.createdAt.getTime();
      if (y === currentYear && t >= currentFrom.getTime() && t <= currentTo.getTime()) {
        monthlyCurrent[m] += p.amountCents;
        currentPeriodTotalCents += p.amountCents;
      }
      if (y === previousYear && t >= previousFrom.getTime() && t <= previousTo.getTime()) {
        monthlyPrevious[m] += p.amountCents;
        previousPeriodTotalCents += p.amountCents;
      }
    }

    const monthsInRange = new Set<number>();
    for (let d = new Date(currentFrom); d <= currentTo; d.setUTCMonth(d.getUTCMonth() + 1, 1)) {
      monthsInRange.add(d.getUTCMonth());
    }

    const monthlyIncome = Array.from({ length: 12 }, (_, idx) => {
      if (!monthsInRange.has(idx)) return null;
      const currentCents = monthlyCurrent[idx];
      const previousCents = monthlyPrevious[idx];
      const yoyPct = previousCents > 0
        ? Number((((currentCents - previousCents) / previousCents) * 100).toFixed(1))
        : null;
      return {
        month: idx + 1,
        monthLabel: String(idx + 1).padStart(2, '0'),
        currentCents,
        previousCents,
        yoyPct,
      };
    }).filter(Boolean);

    const yearlyYoYPct = previousPeriodTotalCents > 0
      ? Number((((currentPeriodTotalCents - previousPeriodTotalCents) / previousPeriodTotalCents) * 100).toFixed(1))
      : null;

    const statusCounts = {
      ACTIVO: 0,
      CONGELADO: 0,
      SUSPENDIDO: 0,
      PRUEBA: 0,
    };

    for (const m of members) {
      statusCounts[m.status] += 1;
    }

    const inactiveCount = statusCounts.CONGELADO + statusCounts.SUSPENDIDO;
    const totalMembers = members.length;
    const reservationUsersByMonth = Array.from({ length: 12 }, () => new Set<string>());
    for (const r of yearlyReservations) {
      if (memberStatusByUserId.has(r.userId)) {
        reservationUsersByMonth[r.startAt.getUTCMonth()].add(r.userId);
      }
    }
    const monthlyActivity = reservationUsersByMonth.map((set, idx) => ({
      month: idx + 1,
      activeStudents: set.size,
      inactiveStudents: Math.max(0, totalMembers - set.size),
    }));

    const planExpirations = activeMemberships
      .map((m) => {
        const endsAtIso = m.endsAt?.toISOString() ?? null;
        const daysToEnd = m.endsAt
          ? Math.ceil((m.endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        return {
          userId: m.userId,
          userName: m.user.name,
          userEmail: m.user.email,
          memberStatus: memberStatusByUserId.get(m.userId) ?? 'ACTIVO',
          planName: m.plan.name,
          interval: m.plan.interval,
          endsAt: endsAtIso,
          daysToEnd,
        };
      })
      .sort((a, b) => {
        if (a.endsAt === null && b.endsAt === null) return 0;
        if (a.endsAt === null) return 1;
        if (b.endsAt === null) return -1;
        return a.endsAt.localeCompare(b.endsAt);
      });

    const expirationSummary = {
      expired: planExpirations.filter((m) => typeof m.daysToEnd === 'number' && m.daysToEnd < 0).length,
      expiring7: planExpirations.filter((m) => typeof m.daysToEnd === 'number' && m.daysToEnd >= 0 && m.daysToEnd <= 7).length,
      expiring30: planExpirations.filter((m) => typeof m.daysToEnd === 'number' && m.daysToEnd >= 0 && m.daysToEnd <= 30).length,
      noEndDate: planExpirations.filter((m) => m.daysToEnd === null).length,
    };

    return {
      year: currentYear,
      previousYear,
      income: {
        periodFrom: currentFrom.toISOString(),
        periodTo: currentTo.toISOString(),
        previousPeriodFrom: previousFrom.toISOString(),
        previousPeriodTo: previousTo.toISOString(),
        yearToDateCents: currentPeriodTotalCents,
        previousYearTotalCents: previousPeriodTotalCents,
        yearlyYoYPct,
        monthly: monthlyIncome,
      },
      students: {
        total: totalMembers,
        active: statusCounts.ACTIVO,
        inactive: inactiveCount,
        frozen: statusCounts.CONGELADO,
        suspended: statusCounts.SUSPENDIDO,
        trial: statusCounts.PRUEBA,
        monthlyActivity,
      },
      memberships: {
        activeCount: activeMemberships.length,
        expirationSummary,
        expiring: planExpirations,
      },
    };
  }
}
