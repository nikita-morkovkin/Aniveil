import { ApiProperty } from '@nestjs/swagger';
import { $Enums, Anime } from '@prisma/client';

export class AnimeResponseDto {
  @ApiProperty({
    description: 'Уникальный ID аниме',
    example: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
  })
  id: string;

  @ApiProperty({
    description: 'Название аниме',
    example: 'Моя геройская академия',
  })
  title: string;

  @ApiProperty({
    description: 'Оригинальное название аниме (если есть)',
    example: 'Boku no Hero Academia',
    required: false,
    nullable: true,
  })
  titleOriginal: string | null;

  @ApiProperty({ description: 'Slug для URL', example: 'my-hero-academia' })
  slug: string;

  @ApiProperty({
    description: 'Описание аниме',
    example: 'Мощное аниме про супергероев...',
    required: false,
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'URL постера',
    example: 'https://s3.amazonaws.com/bucket/poster.jpg',
    required: false,
    nullable: true,
  })
  posterUrl: string | null;

  @ApiProperty({
    description: 'URL баннера',
    example: 'https://s3.amazonaws.com/bucket/banner.jpg',
    required: false,
    nullable: true,
  })
  bannerUrl: string | null;

  @ApiProperty({ description: 'Количество эпизодов', example: 5 })
  episodesCount: number;

  @ApiProperty({ description: 'Количество просмотров', example: 12345 })
  views: number;

  @ApiProperty({
    isArray: true,
    description: 'Жанры аниме',
    example: ['ACTION', 'ADVENTURE'],
  })
  genres: $Enums.Genre[];

  @ApiProperty({
    isArray: true,
    description: 'Теги аниме',
    example: ['SCHOOL', 'SUPER_POWER'],
  })
  tags: $Enums.Tag[];

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

  constructor(anime: Anime) {
    this.id = anime.id;
    this.title = anime.title;
    this.titleOriginal = anime.titleOriginal;
    this.slug = anime.slug;
    this.description = anime.description;
    this.posterUrl = anime.posterUrl;
    this.bannerUrl = anime.bannerUrl;
    this.episodesCount = anime.episodesCount;
    this.views = anime.views;
    this.genres = anime.genres;
    this.tags = anime.tags;
    this.createdAt = anime.createdAt;
    this.updatedAt = anime.updatedAt;
  }
}
