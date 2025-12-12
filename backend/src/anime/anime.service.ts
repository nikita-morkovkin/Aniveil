import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Anime, Prisma } from '@prisma/client';
import { Genre, Tag } from '../enums';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { AnimeFilterDto } from './dto/anime-filter.dto';
import { CreateAnimeDto } from './dto/create-anime.dto';
import { UpdateAnimeDto } from './dto/update-anime.dto';

@Injectable()
export class AnimeService {
  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
  ) {}

  private async uploadImage(
    file: Express.Multer.File | undefined,
    folder: string,
  ): Promise<string | null> {
    if (!file) return null;
    const result = await this.s3.uploadFile(
      file.buffer,
      `anime/${folder}/${file.originalname}`,
      file.mimetype,
    );
    return result.url;
  }

  private parseGenresAndTags(
    genres: string[] | undefined,
    tags: string[] | undefined,
  ) {
    const parsedGenres = genres?.map((genre) => {
      if (!Object.values(Genre).includes(genre as Genre)) {
        throw new BadRequestException(`Недопустимый жанр: ${genre}`);
      }
      return genre as Genre;
    });

    const parsedTags = tags?.map((tag) => {
      if (!Object.values(Tag).includes(tag as Tag)) {
        throw new BadRequestException(`Недопустимый тег: ${tag}`);
      }
      return tag as Tag;
    });

    return { parsedGenres, parsedTags };
  }

  async create(
    createAnimeDto: CreateAnimeDto,
    poster?: Express.Multer.File,
    banner?: Express.Multer.File,
  ) {
    const { genres, tags, ...rest } = createAnimeDto;

    const existingAnime = await this.prisma.anime.findUnique({
      where: { slug: rest.slug },
    });

    if (existingAnime) {
      throw new ConflictException(
        `Аниме со slug '${rest.slug}' уже существует.`,
      );
    }

    const posterUrl = await this.uploadImage(poster, 'posters');
    const bannerUrl = await this.uploadImage(banner, 'banners');

    const { parsedGenres, parsedTags } = this.parseGenresAndTags(
      genres as string[],
      tags as string[],
    );

    const anime = await this.prisma.anime.create({
      data: {
        ...rest,
        posterUrl,
        bannerUrl,
        genres: parsedGenres as Genre[],
        tags: parsedTags as Tag[],
      },
    });
    return anime;
  }

  async findAll(
    filters: AnimeFilterDto,
  ): Promise<{ data: Anime[]; total: number; page: number; limit: number }> {
    const { search, genres, tags, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.AnimeWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { titleOriginal: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (genres && genres.length > 0) {
      where.genres = { hasEvery: genres };
    }

    if (tags && tags.length > 0) {
      where.tags = { hasEvery: tags };
    }

    const [anime, total] = await this.prisma.$transaction([
      this.prisma.anime.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.anime.count({ where }),
    ]);

    return { data: anime, total, page, limit };
  }

  async findOne(id: string) {
    const anime = await this.prisma.anime.findUnique({
      where: { id },
    });
    if (!anime) {
      throw new NotFoundException(`Аниме с ID '${id}' не найдено.`);
    }
    return anime;
  }

  async update(
    id: string,
    updateAnimeDto: UpdateAnimeDto,
    poster?: Express.Multer.File,
    banner?: Express.Multer.File,
  ) {
    const existingAnime = await this.prisma.anime.findUnique({
      where: { id },
    });

    if (!existingAnime) {
      throw new NotFoundException(`Аниме с ID '${id}' не найдено.`);
    }

    if (updateAnimeDto.slug) {
      const animeWithSameSlug = await this.prisma.anime.findUnique({
        where: { slug: updateAnimeDto.slug },
      });

      if (animeWithSameSlug && animeWithSameSlug.id !== id) {
        throw new ConflictException(
          `Аниме со slug '${updateAnimeDto.slug}' уже существует.`,
        );
      }
    }

    const posterUrl = await this.uploadImage(poster, 'posters');
    const bannerUrl = await this.uploadImage(banner, 'banners');

    const { genres, tags, ...rest } = updateAnimeDto;

    const { parsedGenres, parsedTags } = this.parseGenresAndTags(
      genres as string[],
      tags as string[],
    );

    // Формируем данные для обновления, исключая undefined значения
    const updateData: Prisma.AnimeUpdateInput = {
      ...rest,
      posterUrl: posterUrl !== null ? posterUrl : existingAnime.posterUrl,
      bannerUrl: bannerUrl !== null ? bannerUrl : existingAnime.bannerUrl,
    };

    // Обновляем genres только если они явно переданы
    if (genres !== undefined) {
      updateData.genres = parsedGenres as Genre[];
    }

    // Обновляем tags только если они явно переданы
    if (tags !== undefined) {
      updateData.tags = parsedTags as Tag[];
    }

    const anime = await this.prisma.anime.update({
      where: { id },
      data: updateData,
    });
    return anime;
  }

  async remove(id: string) {
    const existingAnime = await this.prisma.anime.findUnique({
      where: { id },
    });

    if (!existingAnime) {
      throw new NotFoundException(`Аниме с ID '${id}' не найдено.`);
    }

    // Удаление постера и баннера из S3, если они существуют
    if (existingAnime.posterUrl) {
      const posterKey = this.extractS3Key(existingAnime.posterUrl);
      if (posterKey) {
        await this.s3.deleteFile(posterKey);
      }
    }
    if (existingAnime.bannerUrl) {
      const bannerKey = this.extractS3Key(existingAnime.bannerUrl);
      if (bannerKey) {
        await this.s3.deleteFile(bannerKey);
      }
    }

    await this.prisma.anime.delete({
      where: { id },
    });
  }

  /**
   * Извлечение S3 ключа из URL или относительного пути
   */
  private extractS3Key(url: string | null): string | null {
    if (!url) return null;

    try {
      // Пытаемся распарсить как URL
      const urlObj = new URL(url);
      return urlObj.pathname.replace(/^\//, '');
    } catch {
      // Если не URL, предполагаем что это уже ключ или относительный путь
      return url.replace(/^\//, '');
    }
  }

  getGenres() {
    return Object.values(Genre).map((genre) => ({
      name: genre,
      slug: genre.toLowerCase().replace(/_/g, '-'),
    }));
  }

  getTags() {
    return Object.values(Tag).map((tag) => ({
      name: tag,
      slug: tag.toLowerCase().replace(/_/g, '-'),
    }));
  }
}
