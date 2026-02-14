import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateTimeBlockDto {
  @ApiProperty()
  @IsString()
  centerId!: string;

  @ApiProperty({ example: 'Feriado Nacional' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '2026-03-03T11:00:00.000Z' })
  @IsString()
  startAt!: string;

  @ApiProperty({ example: '2026-03-03T12:00:00.000Z' })
  @IsString()
  endAt!: string;
}
