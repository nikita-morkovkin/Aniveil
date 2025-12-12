import { ApiProperty } from '@nestjs/swagger';
import { $Enums, VideoQuality } from '@prisma/client';

export class VideoQualityResponseDto {
  @ApiProperty({
    description: 'Уникальный ID качества видео',
    example: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
  })
  id: string;

  @ApiProperty({
    description: 'ID эпизода, к которому относится качество видео',
    example: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
  })
  episodeId: string;

  @ApiProperty({
    description: 'Тип качества видео',
    example: 'Q_720P',
  })
  quality: $Enums.VideoQualityType;

  @ApiProperty({
    description: 'URL HLS manifest файла',
    example: 'anime/animeId/episodes/episodeId/P720/playlist.m3u8',
  })
  hlsUrl: string;

  @ApiProperty({
    description:
      'Размер файла в байтах (как строка для поддержки больших чисел)',
    example: '314572800',
    required: false,
    nullable: true,
    type: String,
  })
  fileSize: string | null;

  @ApiProperty({
    description: 'Дата создания записи',
    example: '2023-01-01T12:00:00.000Z',
  })
  createdAt: Date;

  constructor(videoQuality: VideoQuality) {
    this.id = videoQuality.id;
    this.episodeId = videoQuality.episodeId;
    this.quality = videoQuality.quality;
    this.hlsUrl = videoQuality.hlsUrl;
    this.fileSize = videoQuality.fileSize
      ? videoQuality.fileSize.toString()
      : null;
    this.createdAt = videoQuality.createdAt;
  }
}
