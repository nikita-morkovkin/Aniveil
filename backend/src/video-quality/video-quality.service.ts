import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { CreateVideoQualityDto } from './dto/create-video-quality.dto';

@Injectable()
export class VideoQualityService {
  constructor(
    private prisma: PrismaService,
    private s3: S3Service,
  ) {}

  async create(
    episodeId: string,
    createVideoQualityDto: CreateVideoQualityDto,
  ) {
    const existingEpisode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
    });

    if (!existingEpisode) {
      throw new NotFoundException(`Эпизод с ID '${episodeId}' не найден.`);
    }

    const existingQuality = await this.prisma.videoQuality.findUnique({
      where: {
        episodeId_quality: {
          episodeId,
          quality: createVideoQualityDto.quality,
        },
      },
    });

    if (existingQuality) {
      throw new ConflictException(
        `Качество '${createVideoQualityDto.quality}' для эпизода с ID '${episodeId}' уже существует.`,
      );
    }

    // Генерация HLS URL на основе структуры в S3 (`anime/{animeId}/episodes/{episodeId}/{quality}/playlist.m3u8`)
    const animeId = existingEpisode.animeId;
    const hlsUrl = `anime/${animeId}/episodes/${episodeId}/${createVideoQualityDto.quality}/playlist.m3u8`;

    const videoQuality = await this.prisma.videoQuality.create({
      data: {
        ...createVideoQualityDto,
        episodeId,
        hlsUrl,
      },
    });

    return videoQuality;
  }

  async findAll(episodeId: string) {
    const existingEpisode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
    });

    if (!existingEpisode) {
      throw new NotFoundException(`Эпизод с ID '${episodeId}' не найден.`);
    }

    return this.prisma.videoQuality.findMany({
      where: { episodeId },
      orderBy: { quality: 'asc' },
    });
  }

  async findOne(id: string) {
    const quality = await this.prisma.videoQuality.findUnique({
      where: { id },
    });

    if (!quality) {
      throw new NotFoundException(`Качество видео с ID '${id}' не найдено.`);
    }
    return quality;
  }

  async getHlsManifestUrl(episodeId: string, quality: $Enums.VideoQualityType) {
    const existingEpisode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: { anime: true },
    });

    if (!existingEpisode) {
      throw new NotFoundException(`Эпизод с ID '${episodeId}' не найден.`);
    }

    const videoQuality = await this.prisma.videoQuality.findUnique({
      where: { episodeId_quality: { episodeId, quality } },
    });

    if (!videoQuality) {
      throw new NotFoundException(
        `Качество '${quality}' для эпизода с ID '${episodeId}' не найдено.`,
      );
    }

    // HLS URL уже хранится в БД, остается получить подписанный URL из S3
    const s3Key = videoQuality.hlsUrl;
    return this.s3.getSignedUrl(s3Key);
  }

  async remove(id: string) {
    const existingQuality = await this.prisma.videoQuality.findUnique({
      where: { id },
    });

    if (!existingQuality) {
      throw new NotFoundException(`Качество видео с ID '${id}' не найдено.`);
    }

    // Удаление HLS файлов из S3 (плейлист и сегменты)
    const s3KeyPrefix = existingQuality.hlsUrl.replace('/playlist.m3u8', '');
    await this.s3.deleteByPrefix(s3KeyPrefix);

    await this.prisma.videoQuality.delete({
      where: { id },
    });
  }
}
