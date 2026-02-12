import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePlanDto {
  @ApiProperty()
  @IsString()
  centerId!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  priceCents!: number;

  @ApiProperty({ required: false, default: 'usd' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ enum: ['MONTHLY', 'YEARLY'] })
  @IsIn(['MONTHLY', 'YEARLY'])
  interval!: 'MONTHLY' | 'YEARLY';

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

