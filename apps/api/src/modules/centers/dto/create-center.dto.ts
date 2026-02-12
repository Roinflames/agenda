import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCenterDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ required: false, description: 'Slug opcional (si no se provee, se genera)' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({ required: false, default: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({ required: false, default: 'usd' })
  @IsOptional()
  @IsString()
  currency?: string;
}

