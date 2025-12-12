import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FavoriteService {
  constructor(private prisma: PrismaService) {}

  async add(userId: string, animeId: string) {
    const existingAnime = await this.prisma.anime.findUnique({
      where: { id: animeId },
    });

    if (!existingAnime) {
      throw new NotFoundException(`Аниме с ID '${animeId}' не найдено.`);
    }

    const existingFavorite = await this.prisma.favorite.findUnique({
      where: { userId_animeId: { userId, animeId } },
    });

    if (existingFavorite) {
      throw new ConflictException(
        `Аниме с ID '${animeId}' уже находится в избранном.`,
      );
    }

    const favorite = await this.prisma.favorite.create({
      data: {
        userId,
        animeId,
      },
      include: { anime: true },
    });
    return favorite;
  }

  async findAll(userId: string) {
    return this.prisma.favorite.findMany({
      where: { userId },
      include: { anime: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: string, animeId: string) {
    const existingFavorite = await this.prisma.favorite.findUnique({
      where: { userId_animeId: { userId, animeId } },
    });

    if (!existingFavorite) {
      throw new NotFoundException(
        `Аниме с ID '${animeId}' не найдено в избранном.`,
      );
    }

    await this.prisma.favorite.delete({
      where: { id: existingFavorite.id },
    });
  }
}
