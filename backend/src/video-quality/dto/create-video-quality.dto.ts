import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { VideoQualityType } from '../../enums';

export class CreateVideoQualityDto {
  @ApiProperty({
    enum: VideoQualityType,
    description: 'Тип качества видео',
    example: VideoQualityType.Q_720P,
  })
  @IsEnum(VideoQualityType)
  @IsNotEmpty()
  quality: VideoQualityType;

  @ApiProperty({
    description: 'Размер файла в байтах',
    example: 1024 * 1024 * 300,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  fileSize?: number;
}
