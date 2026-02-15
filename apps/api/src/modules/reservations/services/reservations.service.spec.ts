import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

describe('ReservationsService', () => {
  const access = {
    requireCenterMember: jest.fn(),
    requireCenterExists: jest.fn(),
  } as any;

  const prisma = {
    reservation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    timeBlock: {
      findFirst: jest.fn(),
    },
    classSchedule: {
      findUnique: jest.fn(),
    },
  } as any;

  let service: ReservationsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new ReservationsService(prisma, access);
    access.requireCenterExists.mockResolvedValue({ currency: 'clp' });
    prisma.timeBlock.findFirst.mockResolvedValue(null);
    prisma.reservation.findFirst.mockResolvedValue(null);
    prisma.reservation.count.mockResolvedValue(0);
    prisma.classSchedule.findUnique.mockResolvedValue({ id: 's1', capacity: 10 });
  });

  describe('unit permissions', () => {
    it('bloquea MEMBER intentando reservar para otro usuario', async () => {
      access.requireCenterMember.mockResolvedValue('MEMBER');

      await expect(
        service.create('member-1', {
          centerId: 'c1',
          userId: 'member-2',
          kind: 'CLASS',
          title: 'Clase',
          scheduleId: 's1',
          startAt: '2026-02-20T10:00:00.000Z',
          endAt: '2026-02-20T11:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('bloquea STAFF al modificar reserva no asignada', async () => {
      access.requireCenterMember.mockResolvedValue('STAFF');
      prisma.reservation.findUnique.mockResolvedValue({
        id: 'r1',
        centerId: 'c1',
        userId: 'member-9',
        staffId: 'staff-otro',
      });

      await expect(service.update('staff-1', 'r1', { status: 'CANCELED' })).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('evita reserva duplicada del mismo usuario en mismo horario', async () => {
      access.requireCenterMember.mockResolvedValue('OWNER');
      prisma.reservation.findFirst.mockResolvedValueOnce({ id: 'dup' });

      await expect(
        service.create('owner-1', {
          centerId: 'c1',
          userId: 'member-1',
          kind: 'CLASS',
          title: 'Clase',
          scheduleId: 's1',
          startAt: '2026-02-20T10:00:00.000Z',
          endAt: '2026-02-20T11:00:00.000Z',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('integration flow (service + mocks)', () => {
    it('permite a STAFF crear reserva para alumno y luego verla en list', async () => {
      access.requireCenterMember.mockResolvedValue('STAFF');
      prisma.reservation.create.mockResolvedValue({ id: 'r1' });
      prisma.reservation.findMany.mockResolvedValue([{ id: 'r1', staffId: 'staff-1', userId: 'member-1' }]);

      await service.create('staff-1', {
        centerId: 'c1',
        userId: 'member-1',
        kind: 'CLASS',
        title: 'Clase',
        scheduleId: 's1',
        startAt: '2026-02-20T10:00:00.000Z',
        endAt: '2026-02-20T11:00:00.000Z',
      });

      await service.list('staff-1', 'c1', {});

      expect(prisma.reservation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ staffId: 'staff-1', userId: 'member-1' }),
        }),
      );
      expect(prisma.reservation.findMany).toHaveBeenCalled();
    });
  });
});
