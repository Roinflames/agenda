import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtUser } from '../../auth/types/jwt-user.type';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaymentsService } from '../services/payments.service';

@ApiTags('pagos')
@Controller('pagos')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('crear')
  async create(@CurrentUser() me: JwtUser, @Body() dto: CreatePaymentDto) {
    return this.payments.createCheckout(me.userId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async get(@CurrentUser() me: JwtUser, @Param('id') id: string) {
    return this.payments.get(me.userId, id);
  }

  // Stripe webhook must be unauthenticated.
  @Post('webhook/stripe')
  async stripeWebhook(@Req() req: Request, @Headers('stripe-signature') sig?: string) {
    return this.payments.handleStripeWebhook(req, sig);
  }
}

