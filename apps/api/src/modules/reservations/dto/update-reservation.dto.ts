import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateReservationDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  startAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  endAt?: string;

  @ApiProperty({ required: false, enum: ['CONFIRMED', 'CANCELED'] })
  @IsOptional()
  @IsIn(['CONFIRMED', 'CANCELED'])
  status?: 'CONFIRMED' | 'CANCELED';
}

