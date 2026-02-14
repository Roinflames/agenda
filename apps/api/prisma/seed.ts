import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function envOr(name: string, fallback: string) {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : fallback;
}

async function main() {
  const centerName = envOr('SEED_CENTER_NAME', 'CentroFit Demo');
  const password = envOr('SEED_DEFAULT_PASSWORD', 'DevPassword123!');
  const passwordHash = await bcrypt.hash(password, 12);

  // Rodrigo Reyes — OWNER (admin)
  const adminEmail = envOr('SEED_USER_ADMIN_EMAIL', 'rreyes@example.com').toLowerCase();
  const adminName = envOr('SEED_USER_ADMIN_NAME', 'Rodrigo Reyes');

  // Francisca Beltran — STAFF (profe)
  const staffEmail = envOr('SEED_USER_STAFF_EMAIL', 'francisca.beltran@example.com').toLowerCase();
  const staffName = envOr('SEED_USER_STAFF_NAME', 'Francisca Beltran');

  // Juan Perez — MEMBER (alumno)
  const memberEmail = envOr('SEED_USER_MEMBER_EMAIL', 'juan.perez@example.com').toLowerCase();
  const memberName = envOr('SEED_USER_MEMBER_NAME', 'Juan Perez');

  const [admin, staff, member] = await Promise.all([
    prisma.user.upsert({
      where: { email: adminEmail },
      create: { email: adminEmail, name: adminName, passwordHash, phone: null },
      update: { name: adminName },
    }),
    prisma.user.upsert({
      where: { email: staffEmail },
      create: { email: staffEmail, name: staffName, passwordHash, phone: null },
      update: { name: staffName },
    }),
    prisma.user.upsert({
      where: { email: memberEmail },
      create: { email: memberEmail, name: memberName, passwordHash, phone: null },
      update: { name: memberName },
    }),
  ]);

  const slugBase = centerName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const slug = slugBase ? `${slugBase}-demo` : 'demo-center';

  const center = await prisma.center.upsert({
    where: { slug },
    create: { name: centerName, slug, timezone: 'America/Santiago', currency: 'clp' },
    update: { name: centerName },
  });

  // Rodrigo = OWNER, Francisca = STAFF (profe), Juan = MEMBER (alumno)
  await Promise.all([
    prisma.centerUser.upsert({
      where: { centerId_userId: { centerId: center.id, userId: admin.id } },
      create: { centerId: center.id, userId: admin.id, role: 'OWNER', status: 'ACTIVO' },
      update: { role: 'OWNER', status: 'ACTIVO' },
    }),
    prisma.centerUser.upsert({
      where: { centerId_userId: { centerId: center.id, userId: staff.id } },
      create: { centerId: center.id, userId: staff.id, role: 'STAFF', status: 'ACTIVO' },
      update: { role: 'STAFF', status: 'ACTIVO' },
    }),
    prisma.centerUser.upsert({
      where: { centerId_userId: { centerId: center.id, userId: member.id } },
      create: { centerId: center.id, userId: member.id, role: 'MEMBER', status: 'ACTIVO' },
      update: { role: 'MEMBER', status: 'ACTIVO' },
    }),
  ]);

  // Plan mensual
  const plan = await prisma.membershipPlan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      centerId: center.id,
      name: 'Plan Mensual',
      priceCents: 35000,
      currency: 'clp',
      interval: 'MONTHLY',
      isActive: true,
    },
    update: { centerId: center.id, isActive: true },
  });

  // Juan tiene membresía activa
  await prisma.membership.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      centerId: center.id,
      userId: member.id,
      planId: plan.id,
      status: 'ACTIVE',
      startedAt: new Date(),
    },
    update: { status: 'ACTIVE' },
  });

  // Horarios recurrentes
  const scheduleData = [
    { name: 'CrossFit AM', dayOfWeek: 1, startTime: '07:00', endTime: '08:00', capacity: 15 },
    { name: 'CrossFit AM', dayOfWeek: 2, startTime: '07:00', endTime: '08:00', capacity: 15 },
    { name: 'CrossFit AM', dayOfWeek: 3, startTime: '07:00', endTime: '08:00', capacity: 15 },
    { name: 'CrossFit AM', dayOfWeek: 4, startTime: '07:00', endTime: '08:00', capacity: 15 },
    { name: 'CrossFit AM', dayOfWeek: 5, startTime: '07:00', endTime: '08:00', capacity: 15 },
    { name: 'Yoga', dayOfWeek: 2, startTime: '18:00', endTime: '19:00', capacity: 10 },
    { name: 'Yoga', dayOfWeek: 4, startTime: '18:00', endTime: '19:00', capacity: 10 },
    { name: 'Funcional', dayOfWeek: 6, startTime: '10:00', endTime: '11:00', capacity: 20 },
  ];

  for (const s of scheduleData) {
    await prisma.classSchedule.create({
      data: { centerId: center.id, ...s },
    });
  }

  // Bloqueo: feriado 1 de mayo
  await prisma.timeBlock.create({
    data: {
      centerId: center.id,
      name: 'Dia del Trabajo',
      startAt: new Date('2026-05-01T00:00:00.000Z'),
      endAt: new Date('2026-05-01T23:59:59.000Z'),
    },
  });

  // Reserva de ejemplo: Juan en CrossFit mañana (próximo lunes)
  const now = new Date();
  const daysUntilMonday = ((1 - now.getDay() + 7) % 7) || 7;
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(7, 0, 0, 0);
  const nextMondayEnd = new Date(nextMonday);
  nextMondayEnd.setHours(8, 0, 0, 0);

  await prisma.reservation.create({
    data: {
      centerId: center.id,
      userId: member.id,
      kind: 'CLASS',
      title: 'CrossFit AM',
      startAt: nextMonday,
      endAt: nextMondayEnd,
      status: 'CONFIRMED',
      priceCents: 0,
      currency: center.currency,
    },
  });

  // Pago de ejemplo
  await prisma.payment.create({
    data: {
      centerId: center.id,
      userId: member.id,
      provider: 'MANUAL',
      status: 'PAID',
      amountCents: plan.priceCents,
      currency: plan.currency,
      metadata: { note: 'Seed payment' },
    },
  });

  // eslint-disable-next-line no-console
  console.log('Seed OK');
  // eslint-disable-next-line no-console
  console.log('Center:', { id: center.id, name: center.name, slug: center.slug });
  // eslint-disable-next-line no-console
  console.log('Usuarios:');
  // eslint-disable-next-line no-console
  console.log(' - Admin:', { email: admin.email, name: admin.name, role: 'OWNER' });
  // eslint-disable-next-line no-console
  console.log(' - Profe:', { email: staff.email, name: staff.name, role: 'STAFF' });
  // eslint-disable-next-line no-console
  console.log(' - Alumno:', { email: member.email, name: member.name, role: 'MEMBER' });
  // eslint-disable-next-line no-console
  console.log('Password:', password);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
