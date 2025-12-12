import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { VideoQualityType } from '../enums';
import { CreateVideoQualityDto } from './dto/create-video-quality.dto';
import { VideoQualityResponseDto } from './dto/video-quality-response.dto';
import { VideoQualityService } from './video-quality.service';

@ApiTags('Video Qualities - By Episode')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('episodes')
export class VideoQualityController {
  constructor(private readonly videoQualityService: VideoQualityService) {}

  @Post(':episodeId/qualities')
  @Roles(Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Добавить новое качество видео для эпизода' })
  @ApiResponse({
    status: 201,
    description: 'Качество видео успешно добавлено.',
    type: VideoQualityResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Неверный запрос.' })
  async create(
    @Param('episodeId') episodeId: string,
    @Body() createVideoQualityDto: CreateVideoQualityDto,
  ) {
    const videoQuality = await this.videoQualityService.create(
      episodeId,
      createVideoQualityDto,
    );
    return new VideoQualityResponseDto(videoQuality);
  }

  @Public()
  @Get(':episodeId/qualities')
  @ApiOperation({ summary: 'Получить список доступных качеств для эпизода' })
  @ApiResponse({
    status: 200,
    description: 'Список качеств успешно получен.',
    type: [VideoQualityResponseDto],
  })
  async findAll(@Param('episodeId') episodeId: string) {
    const videoQualities = await this.videoQualityService.findAll(episodeId);
    return videoQualities.map((vq) => new VideoQualityResponseDto(vq));
  }

  @Public()
  @Get(':episodeId/stream/:quality')
  @ApiOperation({ summary: 'Получить HLS manifest URL для эпизода и качества' })
  @ApiParam({
    name: 'quality',
    enum: VideoQualityType,
    description: 'Тип качества видео',
  })
  @ApiResponse({
    status: 200,
    description: 'URL HLS manifest успешно получен.',
    type: String,
  })
  @ApiResponse({
    status: 404,
    description: 'Эпизод или качество видео не найдено.',
  })
  async getHlsManifestUrl(
    @Param('episodeId') episodeId: string,
    @Param('quality') quality: VideoQualityType,
  ) {
    return this.videoQualityService.getHlsManifestUrl(episodeId, quality);
  }
}

@ApiTags('Video Qualities - By ID')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('video-qualities')
export class VideoQualityByIdController {
  constructor(private readonly videoQualityService: VideoQualityService) {}

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Получить детали качества видео по ID' })
  @ApiResponse({
    status: 200,
    description: 'Детали качества видео успешно получены.',
    type: VideoQualityResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Качество видео не найдено.' })
  async findOne(@Param('id') id: string) {
    const videoQuality = await this.videoQualityService.findOne(id);
    return new VideoQualityResponseDto(videoQuality);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить качество видео по ID' })
  @ApiResponse({ status: 204, description: 'Качество видео успешно удалено.' })
  @ApiResponse({ status: 404, description: 'Качество видео не найдено.' })
  remove(@Param('id') id: string) {
    return this.videoQualityService.remove(id);
  }
}
