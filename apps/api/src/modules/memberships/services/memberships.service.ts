import { BadRequestException, Injectable } from '@nestjs/common';
import { AccessService } from '../../access/access.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AssignMembershipDto } from '../dto/assign-membership.dto';
import { CreatePlanDto } from '../dto/create-plan.dto';
import { UpdatePlanDto } from '../dto/update-plan.dto';

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async listPlans(requesterId: string, centerId: string) {
    await this.access.requireCenterMember(requesterId, centerId);
    const plans = await this.prisma.membershipPlan.findMany({
      where: { centerId },
      orderBy: { createdAt: 'desc' },
    });
    return { plans };
  }

  async createPlan(requesterId: string, dto: CreatePlanDto) {
    await this.access.requireCenterRole(requesterId, dto.centerId, ['OWNER', 'ADMIN']);
    const center = await this.access.requireCenterExists(dto.centerId);
    const plan = await this.prisma.membershipPlan.create({
      data: {
        centerId: dto.centerId,
        name: dto.name,
        priceCents: dto.priceCents,
        currency: dto.currency ?? center.currency,
        interval: dto.interval,
        isActive: dto.isActive ?? true,
      },
    });
    return { plan };
  }

  async updatePlan(requesterId: string, centerId: string, planId: string, dto: UpdatePlanDto) {
    await this.access.requireCenterRole(requesterId, centerId, ['OWNER', 'ADMIN']);
    const plan = await this.prisma.membershipPlan.update({
      where: { id: planId },
      data: {
        name: dto.name,
        priceCents: dto.priceCents,
        currency: dto.currency,
        interval: dto.interval,
        isActive: dto.isActive,
      },
    });
    return { plan };
  }

  async removePlan(requesterId: string, centerId: string, planId: string) {
    await this.access.requireCenterRole(requesterId, centerId, ['OWNER']);
    await this.prisma.membershipPlan.delete({ where: { id: planId } });
    return { ok: true };
  }

  async assign(requesterId: string, dto: AssignMembershipDto) {
    await this.access.requireCenterRole(requesterId, dto.centerId, ['OWNER', 'ADMIN', 'STAFF']);

    const plan = await this.prisma.membershipPlan.findUnique({ where: { id: dto.planId } });
    if (!plan || plan.centerId !== dto.centerId) throw new BadRequestException('Plan inválido');

    const membership = await this.prisma.membership.create({
      data: {
        centerId: dto.centerId,
        userId: dto.userId,
        planId: dto.planId,
        status: 'ACTIVE',
        startedAt: new Date(),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      },
    });

    return { membership };
  }

  async paymentHistory(requesterId: string, centerId: string, filter: { userId?: string }) {
    const role = await this.access.requireCenterMember(requesterId, centerId);
    const userId = filter.userId;
    if (userId && role === 'MEMBER' && userId !== requesterId) {
      throw new BadRequestException('Solo puedes ver tu historial');
    }
    const payments = await this.prisma.payment.findMany({
      where: { centerId, ...(userId ? { userId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    return { payments };
  }
}

