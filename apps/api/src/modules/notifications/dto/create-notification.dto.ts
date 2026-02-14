import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty()
  @IsString()
  centerId!: string;

  @ApiProperty()
  @IsString()
  userId!: string;

  @ApiProperty({ enum: ['EMAIL', 'PUSH'] })
  @IsString()
  @IsIn(['EMAIL', 'PUSH'])
  channel!: 'EMAIL' | 'PUSH';

  @ApiProperty({ example: 'Cambio de horario' })
  @IsString()
  @MaxLength(140)
  title!: string;

  @ApiProperty({ example: 'Tu clase del lunes se movio a las 19:00.' })
  @IsString()
  @MaxLength(1000)
  message!: string;
}
