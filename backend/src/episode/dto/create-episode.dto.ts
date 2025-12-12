import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateEpisodeDto {
  @ApiProperty({ description: 'Номер эпизода', example: 1 })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  number: number;

  @ApiProperty({
    description: 'Название эпизода (если есть)',
    example: 'Начало',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Продолжительность эпизода в секундах',
    example: 1440,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;
}
