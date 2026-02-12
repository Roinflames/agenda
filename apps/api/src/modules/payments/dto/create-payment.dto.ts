import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty()
  @IsString()
  centerId!: string;

  @ApiProperty({ required: false, description: 'Opcional (si eres admin/staff puedes crear para otro usuario)' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ description: 'MembershipPlan ID' })
  @IsString()
  planId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

