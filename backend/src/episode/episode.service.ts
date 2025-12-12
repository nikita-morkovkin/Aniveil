import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { UpdateEpisodeDto } from './dto/update-episode.dto';

@Injectable()
export class EpisodeService {
  constructor(private prisma: PrismaService) {}

  async create(animeId: string, createEpisodeDto: CreateEpisodeDto) {
    const existingAnime = await this.prisma.anime.findUnique({
      where: { id: animeId },
    });

    if (!existingAnime) {
      throw new NotFoundException(`Аниме с ID '${animeId}' не найдено.`);
    }

    const existingEpisode = await this.prisma.episode.findUnique({
      where: { animeId_number: { animeId, number: createEpisodeDto.number } },
    });

    if (existingEpisode) {
      throw new ConflictException(
        `Эпизод №${createEpisodeDto.number} для аниме с ID '${animeId}' уже существует.`,
      );
    }

    const episode = await this.prisma.episode.create({
      data: {
        ...createEpisodeDto,
        animeId,
      },
    });

    await this.prisma.anime.update({
      where: { id: animeId },
      data: {
        episodesCount: { increment: 1 },
      },
    });

    return episode;
  }

  async findAll(animeId: string) {
    const existingAnime = await this.prisma.anime.findUnique({
      where: { id: animeId },
    });

    if (!existingAnime) {
      throw new NotFoundException(`Аниме с ID '${animeId}' не найдено.`);
    }

    return this.prisma.episode.findMany({
      where: { animeId },
      orderBy: { number: 'asc' },
    });
  }

  async findOne(id: string) {
    const episode = await this.prisma.episode.findUnique({
      where: { id },
    });

    if (!episode) {
      throw new NotFoundException(`Эпизод с ID '${id}' не найден.`);
    }
    return episode;
  }

  async update(id: string, updateEpisodeDto: UpdateEpisodeDto) {
    const existingEpisode = await this.prisma.episode.findUnique({
      where: { id },
    });

    if (!existingEpisode) {
      throw new NotFoundException(`Эпизод с ID '${id}' не найден.`);
    }

    if (
      updateEpisodeDto.number &&
      updateEpisodeDto.number !== existingEpisode.number
    ) {
      const episodeWithSameNumber = await this.prisma.episode.findUnique({
        where: {
          animeId_number: {
            animeId: existingEpisode.animeId,
            number: updateEpisodeDto.number,
          },
        },
      });

      if (episodeWithSameNumber) {
        throw new ConflictException(
          `Эпизод №${updateEpisodeDto.number} для данного аниме уже существует.`,
        );
      }
    }

    const episode = await this.prisma.episode.update({
      where: { id },
      data: updateEpisodeDto,
    });
    return episode;
  }

  async remove(id: string) {
    const existingEpisode = await this.prisma.episode.findUnique({
      where: { id },
    });

    if (!existingEpisode) {
      throw new NotFoundException(`Эпизод с ID '${id}' не найден.`);
    }

    await this.prisma.episode.delete({
      where: { id },
    });

    await this.prisma.anime.update({
      where: { id: existingEpisode.animeId },
      data: {
        episodesCount: { decrement: 1 },
      },
    });
  }
}
