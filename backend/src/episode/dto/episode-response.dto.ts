import { ApiProperty } from '@nestjs/swagger';
import { Episode } from '@prisma/client';

export class EpisodeResponseDto {
  @ApiProperty({
    description: 'Уникальный ID эпизода',
    example: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
  })
  id: string;

  @ApiProperty({
    description: 'ID аниме, к которому принадлежит эпизод',
    example: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
  })
  animeId: string;

  @ApiProperty({ description: 'Номер эпизода', example: 1 })
  number: number;

  @ApiProperty({
    description: 'Название эпизода (если есть)',
    example: 'Начало',
    required: false,
    nullable: true,
  })
  title: string | null;

  @ApiProperty({
    description: 'Продолжительность эпизода в секундах',
    example: 1440,
    required: false,
    nullable: true,
  })
  duration: number | null;

  @ApiProperty({ description: 'Количество просмотров эпизода', example: 123 })
  views: number;

  @ApiProperty({
    description: 'Дата создания записи',
    example: '2023-01-01T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Дата последнего обновления записи',
    example: '2023-01-01T13:00:00.000Z',
  })
  updatedAt: Date;

  constructor(episode: Episode) {
    this.id = episode.id;
    this.animeId = episode.animeId;
    this.number = episode.number;
    this.title = episode.title;
    this.duration = episode.duration;
    this.views = episode.views;
    this.createdAt = episode.createdAt;
    this.updatedAt = episode.updatedAt;
  }
}
