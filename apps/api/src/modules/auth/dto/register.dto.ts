import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false, description: 'Si true, crea un centro y asigna al usuario como OWNER.' })
  @IsOptional()
  @IsBoolean()
  createCenter?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  centerName?: string;
}

