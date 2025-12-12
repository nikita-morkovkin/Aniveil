import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { VideoQualityType } from '../enums';
import {
  ConversionResultDto,
  ConversionStatusDto,
} from './dto/conversion-status.dto';
import { VideoProcessorService } from './video-processor.service';

@ApiTags('Video Processor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('video-processor')
export class VideoProcessorController {
  constructor(private readonly videoProcessor: VideoProcessorService) {}

  /**
   * Конвертация видео через API
   */
  @Post('convert')
  @Roles(Role.MODERATOR, Role.ADMIN)
  @UseInterceptors(FileInterceptor('video'))
  @ApiOperation({
    summary: 'Конвертация видео в HLS',
    description:
      'Загружает видео файл, конвертирует в HLS формат с несколькими качествами и загружает в S3',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Видео файл и параметры конвертации',
    schema: {
      type: 'object',
      properties: {
        video: {
          type: 'string',
          format: 'binary',
          description: 'MP4 видео файл',
        },
        animeId: {
          type: 'string',
          format: 'uuid',
          description: 'ID аниме',
        },
        episodeId: {
          type: 'string',
          format: 'uuid',
          description: 'ID эпизода',
        },
        qualities: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['Q_360P', 'Q_480P', 'Q_720P', 'Q_1080P'],
          },
          description: 'Список качеств для конвертации',
        },
      },
      required: ['video', 'animeId', 'episodeId', 'qualities'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Конвертация начата',
    type: ConversionResultDto,
  })
  @ApiResponse({ status: 400, description: 'Неверные параметры' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав' })
  async convertVideo(
    @UploadedFile() video: Express.Multer.File,
    @Body()
    body: {
      animeId: string;
      episodeId: string;
      qualities: string | string[];
    },
  ): Promise<ConversionResultDto> {
    if (!video) {
      throw new BadRequestException('Video file is required');
    }

    const { animeId, episodeId, qualities } = body;

    if (!animeId || !episodeId || !qualities) {
      throw new BadRequestException(
        'animeId, episodeId and qualities are required',
      );
    }

    // Парсинг qualities (может прийти как строка или массив)
    let qualitiesArray: string[];
    if (typeof qualities === 'string') {
      try {
        const parsed: unknown = JSON.parse(qualities);
        if (
          Array.isArray(parsed) &&
          parsed.every((item) => typeof item === 'string')
        ) {
          qualitiesArray = parsed;
        } else {
          throw new Error('Not a string array');
        }
      } catch {
        // Если не JSON, пробуем разделить по запятой
        qualitiesArray = qualities.split(',').map((q: string) => q.trim());
      }
    } else {
      qualitiesArray = qualities;
    }

    // Валидация качеств
    const validQualities = Object.values(VideoQualityType);
    const typedQualities: VideoQualityType[] = [];

    for (const quality of qualitiesArray) {
      if (validQualities.includes(quality as VideoQualityType)) {
        typedQualities.push(quality as VideoQualityType);
      } else {
        throw new BadRequestException(`Invalid quality: ${quality}`);
      }
    }

    return this.videoProcessor.convertFromBuffer(
      video.buffer,
      animeId,
      episodeId,
      typedQualities,
    );
  }

  /**
   * Получение статуса конвертации
   */
  @Get('status/:jobId')
  @Roles(Role.MODERATOR, Role.ADMIN)
  @ApiOperation({
    summary: 'Получение статуса конвертации',
    description: 'Возвращает текущий статус задачи конвертации по ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Статус конвертации',
    type: ConversionStatusDto,
  })
  @ApiResponse({ status: 404, description: 'Задача не найдена' })
  getStatus(@Param('jobId') jobId: string): ConversionStatusDto {
    return this.videoProcessor.getConversionStatus(jobId);
  }
}
