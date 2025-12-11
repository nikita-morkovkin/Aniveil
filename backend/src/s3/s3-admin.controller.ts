import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AllowedFileTypes, MaxFileSize } from './decorators';
import {
  DeleteBatchDto,
  DeleteByPrefixDto,
  DeleteFileDto,
  DeleteResultDto,
  FileMetadataResponseDto,
  GeneratePresignedPostDto,
  GetUrlDto,
  PresignedPostResponseDto,
  UploadFileDto,
  UploadFileResponseDto,
} from './dto';
import { FileSizeGuard, FileTypeGuard } from './guards';
import { ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES } from './s3.constants';
import { S3Service } from './s3.service';

@ApiTags('S3 Storage (Admin)')
@Controller('s3')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MODERATOR', 'ADMIN')
@ApiBearerAuth()
export class S3AdminController {
  constructor(private readonly s3Service: S3Service) {}

  @Post('upload')
  @UseGuards(FileTypeGuard, FileSizeGuard)
  @AllowedFileTypes(...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES)
  @MaxFileSize(10 * 1024 * 1024 * 1024) // 10GB
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Загрузить файл' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    type: UploadFileDto,
  })
  @ApiResponse({ status: 201, type: UploadFileResponseDto })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
  ): Promise<UploadFileResponseDto> {
    return this.s3Service.uploadFile(
      file.buffer,
      dto.key,
      dto.contentType ?? file.mimetype,
    );
  }

  @Delete('file')
  @ApiOperation({ summary: 'Удалить файл' })
  @ApiResponse({ status: 200, description: 'Файл удалён' })
  async deleteFile(@Query() dto: DeleteFileDto): Promise<{ message: string }> {
    await this.s3Service.deleteFile(dto.key);
    return { message: 'Файл удалён' };
  }

  @Delete('batch')
  @ApiOperation({ summary: 'Удалить несколько файлов' })
  @ApiResponse({ status: 200, type: DeleteResultDto })
  async deleteBatch(@Body() dto: DeleteBatchDto): Promise<DeleteResultDto> {
    return this.s3Service.deleteBatch(dto.keys);
  }

  @Delete('prefix')
  @ApiOperation({ summary: 'Удалить все файлы по префиксу' })
  @ApiResponse({ status: 200, type: DeleteResultDto })
  async deleteByPrefix(
    @Body() dto: DeleteByPrefixDto,
  ): Promise<DeleteResultDto> {
    return this.s3Service.deleteByPrefix(dto.prefix);
  }

  @Delete('episode/:animeId/:episodeId')
  @ApiOperation({ summary: 'Удалить все файлы эпизода' })
  @ApiResponse({ status: 200, type: DeleteResultDto })
  async deleteEpisode(
    @Param('animeId') animeId: string,
    @Param('episodeId') episodeId: string,
  ): Promise<DeleteResultDto> {
    return this.s3Service.deleteEpisode(animeId, episodeId);
  }

  @Delete('episode/:animeId/:episodeId/:quality')
  @ApiOperation({ summary: 'Удалить качество эпизода' })
  @ApiResponse({ status: 200, type: DeleteResultDto })
  async deleteEpisodeQuality(
    @Param('animeId') animeId: string,
    @Param('episodeId') episodeId: string,
    @Param('quality') quality: string,
  ): Promise<DeleteResultDto> {
    return this.s3Service.deleteEpisodeQuality(animeId, episodeId, quality);
  }

  @Delete('anime/:animeId')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Удалить все файлы аниме (только ADMIN)' })
  @ApiResponse({ status: 200, type: DeleteResultDto })
  async deleteAnime(
    @Param('animeId') animeId: string,
  ): Promise<DeleteResultDto> {
    return this.s3Service.deleteAnime(animeId);
  }

  @Get('list')
  @ApiOperation({ summary: 'Получить список файлов по префиксу' })
  @ApiQuery({ name: 'prefix', example: 'anime/123/' })
  @ApiQuery({ name: 'maxKeys', required: false, example: 1000 })
  @ApiResponse({ status: 200 })
  async listFiles(
    @Query('prefix') prefix: string,
    @Query('maxKeys') maxKeys?: string,
  ) {
    const max = maxKeys ? parseInt(maxKeys, 10) : 1000;
    return this.s3Service.listFiles(prefix, max);
  }

  @Get('metadata')
  @ApiOperation({ summary: 'Получить метаданные файла' })
  @ApiResponse({ status: 200, type: FileMetadataResponseDto })
  async getFileMetadata(
    @Query() dto: GetUrlDto,
  ): Promise<FileMetadataResponseDto> {
    const metadata = await this.s3Service.getFileMetadata(dto.key);
    return {
      key: metadata.key,
      size: metadata.size,
      contentType: metadata.contentType,
      etag: metadata.etag,
      lastModified: metadata.lastModified,
    };
  }

  @Get('episode-files/:animeId/:episodeId')
  @ApiOperation({ summary: 'Получить все файлы эпизода' })
  @ApiResponse({ status: 200 })
  async getEpisodeFiles(
    @Param('animeId') animeId: string,
    @Param('episodeId') episodeId: string,
  ) {
    return this.s3Service.getEpisodeFiles(animeId, episodeId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Получить статистику хранилища' })
  @ApiQuery({ name: 'animeId', required: false })
  @ApiResponse({ status: 200 })
  async getStorageStats(@Query('animeId') animeId?: string) {
    return this.s3Service.getStorageStats(animeId);
  }

  @Post('copy')
  @ApiOperation({ summary: 'Копировать файл' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sourceKey: { type: 'string', example: 'anime/123/cover.jpg' },
        destinationKey: { type: 'string', example: 'backup/123/cover.jpg' },
      },
    },
  })
  @ApiResponse({ status: 201 })
  async copyFile(
    @Body('sourceKey') sourceKey: string,
    @Body('destinationKey') destinationKey: string,
  ) {
    return this.s3Service.copyFile(sourceKey, destinationKey);
  }

  @Post('move')
  @ApiOperation({ summary: 'Переместить файл' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sourceKey: { type: 'string', example: 'temp/upload.jpg' },
        destinationKey: { type: 'string', example: 'anime/123/cover.jpg' },
      },
    },
  })
  @ApiResponse({ status: 201 })
  async moveFile(
    @Body('sourceKey') sourceKey: string,
    @Body('destinationKey') destinationKey: string,
  ) {
    return this.s3Service.moveFile(sourceKey, destinationKey);
  }

  @Post('presigned-post')
  @ApiOperation({
    summary: 'Сгенерировать данные для прямой загрузки с клиента',
    description:
      'Генерирует URL и поля для загрузки файла напрямую с клиента через POST FormData. ' +
      'Используется для загрузки больших файлов без прохождения через сервер.',
  })
  @ApiResponse({ status: 201, type: PresignedPostResponseDto })
  async generatePresignedPost(
    @Body() dto: GeneratePresignedPostDto,
  ): Promise<PresignedPostResponseDto> {
    return this.s3Service.generatePresignedPost(
      dto.key,
      dto.contentType,
      dto.maxSizeBytes,
      dto.expiresInSeconds,
    );
  }
}
