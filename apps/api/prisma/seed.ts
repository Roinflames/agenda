import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function envOr(name: string, fallback: string) {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : fallback;
}

async function main() {
  const centerName = envOr('SEED_CENTER_NAME', 'Home Gym Demo');
  const password = envOr('SEED_DEFAULT_PASSWORD', 'DevPassword123!');
  const passwordHash = await bcrypt.hash(password, 12);

  const user1Email = envOr('SEED_USER_1_EMAIL', 'francisca.beltran@example.com').toLowerCase();
  const user1Name = envOr('SEED_USER_1_NAME', 'Francisca Beltran');

  const user2Email = envOr('SEED_USER_2_EMAIL', 'rreyes@example.com').toLowerCase();
  const user2Name = envOr('SEED_USER_2_NAME', 'Roberto Reyes');

  const [u1, u2] = await Promise.all([
    prisma.user.upsert({
      where: { email: user1Email },
      create: { email: user1Email, name: user1Name, passwordHash, phone: null },
      update: { name: user1Name },
    }),
    prisma.user.upsert({
      where: { email: user2Email },
      create: { email: user2Email, name: user2Name, passwordHash, phone: null },
      update: { name: user2Name },
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

  // You as OWNER, Francisca as MEMBER by default.
  await Promise.all([
    prisma.centerUser.upsert({
      where: { centerId_userId: { centerId: center.id, userId: u2.id } },
      create: { centerId: center.id, userId: u2.id, role: 'OWNER' },
      update: { role: 'OWNER' },
    }),
    prisma.centerUser.upsert({
      where: { centerId_userId: { centerId: center.id, userId: u1.id } },
      create: { centerId: center.id, userId: u1.id, role: 'MEMBER' },
      update: { role: 'MEMBER' },
    }),
  ]);

  const plan = await prisma.membershipPlan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      centerId: center.id,
      name: 'Plan Mensual Demo',
      priceCents: 300000, // CLP $3.000 as "cents" placeholder
      currency: 'clp',
      interval: 'MONTHLY',
      isActive: true,
    },
    update: { centerId: center.id, isActive: true },
  });

  await prisma.membership.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      centerId: center.id,
      userId: u1.id,
      planId: plan.id,
      status: 'ACTIVE',
      startedAt: new Date(),
    },
    update: { status: 'ACTIVE' },
  });

  const start = new Date(Date.now() + 1000 * 60 * 60 * 24);
  const end = new Date(start.getTime() + 1000 * 60 * 60);
  await prisma.reservation.create({
    data: {
      centerId: center.id,
      userId: u1.id,
      kind: 'CLASS',
      title: 'Clase Demo (Francisca)',
      startAt: start,
      endAt: end,
      status: 'CONFIRMED',
      priceCents: 0,
      currency: center.currency,
    },
  });

  // Seed a paid payment example
  await prisma.payment.create({
    data: {
      centerId: center.id,
      userId: u1.id,
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
  console.log('Users:');
  // eslint-disable-next-line no-console
  console.log(' -', { email: u1.email, name: u1.name, role: 'MEMBER' });
  // eslint-disable-next-line no-console
  console.log(' -', { email: u2.email, name: u2.name, role: 'OWNER' });
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

