import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  centerId!: string;

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

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ required: false, enum: ['OWNER', 'ADMIN', 'STAFF', 'MEMBER'], default: 'MEMBER' })
  @IsOptional()
  @IsIn(['OWNER', 'ADMIN', 'STAFF', 'MEMBER'])
  role?: 'OWNER' | 'ADMIN' | 'STAFF' | 'MEMBER';

  @ApiProperty({ required: false, enum: ['ACTIVO', 'CONGELADO', 'SUSPENDIDO', 'PRUEBA'], default: 'ACTIVO' })
  @IsOptional()
  @IsIn(['ACTIVO', 'CONGELADO', 'SUSPENDIDO', 'PRUEBA'])
  status?: 'ACTIVO' | 'CONGELADO' | 'SUSPENDIDO' | 'PRUEBA';
}
