import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateTimeBlockDto {
  @ApiPropertyOptional({ example: 'Feriado Nacional' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '2026-03-03T11:00:00.000Z' })
  @IsOptional()
  @IsString()
  startAt?: string;

  @ApiPropertyOptional({ example: '2026-03-03T12:00:00.000Z' })
  @IsOptional()
  @IsString()
  endAt?: string;
}
