import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AssignMembershipDto {
  @ApiProperty()
  @IsString()
  centerId!: string;

  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty()
  @IsString()
  planId!: string;

  @ApiProperty({ required: false, description: 'ISO date' })
  @IsOptional()
  @IsString()
  endsAt?: string;
}

