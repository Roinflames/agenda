import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty()
  @IsString()
  centerId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ required: false, enum: ['OWNER', 'ADMIN', 'STAFF', 'MEMBER'] })
  @IsOptional()
  @IsIn(['OWNER', 'ADMIN', 'STAFF', 'MEMBER'])
  role?: 'OWNER' | 'ADMIN' | 'STAFF' | 'MEMBER';

  @ApiProperty({ required: false, enum: ['ACTIVO', 'CONGELADO', 'SUSPENDIDO', 'PRUEBA'] })
  @IsOptional()
  @IsIn(['ACTIVO', 'CONGELADO', 'SUSPENDIDO', 'PRUEBA'])
  status?: 'ACTIVO' | 'CONGELADO' | 'SUSPENDIDO' | 'PRUEBA';
}
