import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty()
  @IsString()
  centerId!: string;

  @ApiProperty({ example: 'CrossFit Matinal' })
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1, description: '0=Dom, 1=Lun, ..., 6=Sab' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: '07:00' })
  @IsString()
  startTime!: string;

  @ApiProperty({ example: '08:00' })
  @IsString()
  endTime!: string;

  @ApiProperty({ required: false, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  spaceId?: string;
}
