import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import { AccessService } from '../../access/access.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { Request } from 'express';

@Injectable()
export class PaymentsService {
  private stripe(): Stripe {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new BadRequestException('STRIPE_SECRET_KEY no configurada');
    return new Stripe(key, { apiVersion: '2024-06-20' as any });
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async createCheckout(requesterId: string, dto: CreatePaymentDto) {
    const role = await this.access.requireCenterMember(requesterId, dto.centerId);
    const userId = dto.userId ?? requesterId;
    if (role === 'MEMBER' && userId !== requesterId) throw new BadRequestException('No permitido');

    const plan = await this.prisma.membershipPlan.findUnique({ where: { id: dto.planId } });
    if (!plan || plan.centerId !== dto.centerId) throw new BadRequestException('Plan inválido');

    const successUrl = dto.successUrl ?? process.env.STRIPE_SUCCESS_URL ?? 'http://localhost:5173/pay/success';
    const cancelUrl = dto.cancelUrl ?? process.env.STRIPE_CANCEL_URL ?? 'http://localhost:5173/pay/cancel';

    const stripe = this.stripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: plan.currency,
            unit_amount: plan.priceCents,
            product_data: { name: plan.name },
          },
        },
      ],
      metadata: {
        centerId: dto.centerId,
        userId,
        planId: dto.planId,
      },
    });

    const payment = await this.prisma.payment.create({
      data: {
        centerId: dto.centerId,
        userId,
        provider: 'STRIPE',
        status: 'PENDING',
        amountCents: plan.priceCents,
        currency: plan.currency,
        stripeCheckoutSessionId: session.id,
        metadata: session.metadata as any,
      },
    });

    return { paymentId: payment.id, checkoutUrl: session.url };
  }

  async get(requesterId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Pago no encontrado');

    const role = await this.access.requireCenterMember(requesterId, payment.centerId);
    if (role === 'MEMBER' && payment.userId !== requesterId) throw new BadRequestException('No permitido');

    return { payment };
  }

  async handleStripeWebhook(req: Request, signature?: string) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) throw new BadRequestException('STRIPE_WEBHOOK_SECRET no configurada');

    const rawBody = (req as any).rawBody as Buffer | undefined;
    if (!rawBody) throw new BadRequestException('rawBody no disponible');
    if (!signature) throw new BadRequestException('stripe-signature requerido');

    const stripe = this.stripe();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (e: any) {
      throw new BadRequestException(`Webhook inválido: ${e?.message ?? 'unknown'}`);
    }

    // Idempotency store
    const existing = await this.prisma.webhookEvent.findUnique({ where: { eventId: event.id } });
    if (existing) return { received: true, duplicate: true };

    await this.prisma.webhookEvent.create({
      data: { provider: 'stripe', eventId: event.id, payload: event as any },
    });

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const sessionId = session.id;
      const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : undefined;

      const payment = await this.prisma.payment.findFirst({ where: { stripeCheckoutSessionId: sessionId } });
      if (payment) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'PAID',
            stripePaymentIntentId: paymentIntentId,
          },
        });
      }
    }

    return { received: true };
  }
}

