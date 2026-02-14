import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty()
  @IsString()
  centerId!: string;

  @ApiProperty({ required: false, description: 'Si eres admin/staff puedes crear para otro usuario.' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiProperty({ enum: ['CLASS', 'SPACE'] })
  @IsIn(['CLASS', 'SPACE'])
  kind!: 'CLASS' | 'SPACE';

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  spaceId?: string;

  @ApiProperty({ required: false, description: 'ID del horario de clase (para validar capacidad)' })
  @IsOptional()
  @IsString()
  scheduleId?: string;

  @ApiProperty({ example: '2026-02-12T10:00:00.000Z' })
  @IsString()
  startAt!: string;

  @ApiProperty({ example: '2026-02-12T11:00:00.000Z' })
  @IsString()
  endAt!: string;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @ApiProperty({ required: false, default: 'usd' })
  @IsOptional()
  @IsString()
  currency?: string;
}

