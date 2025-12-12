import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsString, IsUUID } from 'class-validator';
import { VideoQualityType } from '../../enums';

export class ConvertVideoDto {
  @ApiProperty({
    description: 'ID аниме',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  animeId: string;

  @ApiProperty({
    description: 'ID эпизода',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsUUID()
  episodeId: string;

  @ApiProperty({
    description: 'Список качеств для конвертации',
    enum: VideoQualityType,
    isArray: true,
    example: ['Q_360P', 'Q_480P', 'Q_720P', 'Q_1080P'],
  })
  @IsArray()
  @IsEnum(VideoQualityType, { each: true })
  qualities: VideoQualityType[];
}

export class ConvertVideoLocalDto extends ConvertVideoDto {
  @ApiProperty({
    description: 'Путь к входному видео файлу',
    example: '/path/to/video.mp4',
  })
  @IsString()
  inputPath: string;
}
