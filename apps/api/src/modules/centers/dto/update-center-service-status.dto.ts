import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateCenterServiceStatusDto {
  @ApiProperty({ enum: ['ACTIVE', 'SUSPENDED'] })
  @IsIn(['ACTIVE', 'SUSPENDED'])
  serviceStatus!: 'ACTIVE' | 'SUSPENDED';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  suspensionReason?: string;
}
