import { ApiProperty } from '@nestjs/swagger';
import { Anime, Favorite } from '@prisma/client';
import { AnimeResponseDto } from '../../anime/dto/anime-response.dto';

export class FavoriteResponseDto {
  @ApiProperty({
    description: 'Уникальный ID записи избранного',
    example: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
  })
  id: string;

  @ApiProperty({
    description: 'ID пользователя',
    example: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
  })
  userId: string;

  @ApiProperty({
    description: 'ID аниме',
    example: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
  })
  animeId: string;

  @ApiProperty({
    description: 'Дата добавления в избранное',
    example: '2023-01-01T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({ type: AnimeResponseDto, description: 'Информация об аниме' })
  anime: AnimeResponseDto;

  constructor(favorite: Favorite & { anime: Anime }) {
    this.id = favorite.id;
    this.userId = favorite.userId;
    this.animeId = favorite.animeId;
    this.createdAt = favorite.createdAt;
    this.anime = new AnimeResponseDto(favorite.anime);
  }
}
