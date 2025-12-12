import { ApiProperty } from '@nestjs/swagger';
import { VideoQualityType } from '../../enums';

export enum ConversionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export class ConversionStatusDto {
  @ApiProperty({
    description: 'ID задачи конвертации',
    example: 'job_123456789',
  })
  jobId: string;

  @ApiProperty({
    description: 'Статус конвертации',
    enum: ConversionStatus,
    example: ConversionStatus.PROCESSING,
  })
  status: ConversionStatus;

  @ApiProperty({
    description: 'Прогресс конвертации (0-100)',
    example: 45.5,
    required: false,
  })
  progress?: number;

  @ApiProperty({
    description: 'Текущая обрабатываемая качество',
    enum: VideoQualityType,
    required: false,
  })
  currentQuality?: VideoQualityType;

  @ApiProperty({
    description: 'Сообщение об ошибке',
    required: false,
  })
  error?: string;

  @ApiProperty({
    description: 'Время начала конвертации',
  })
  startedAt: Date;

  @ApiProperty({
    description: 'Время завершения конвертации',
    required: false,
  })
  completedAt?: Date;
}

export class ConversionResultDto {
  @ApiProperty({
    description: 'ID задачи конвертации',
    example: 'job_123456789',
  })
  jobId: string;

  @ApiProperty({
    description: 'ID аниме',
  })
  animeId: string;

  @ApiProperty({
    description: 'ID эпизода',
  })
  episodeId: string;

  @ApiProperty({
    description: 'Сконвертированные качества',
    enum: VideoQualityType,
    isArray: true,
  })
  qualities: VideoQualityType[];

  @ApiProperty({
    description: 'URL master playlist в S3',
  })
  masterPlaylistUrl: string;

  @ApiProperty({
    description: 'Длительность видео в секундах',
  })
  duration: number;

  @ApiProperty({
    description: 'Общий размер файлов',
  })
  totalSize: number;
}
