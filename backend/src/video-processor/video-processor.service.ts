import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import { readFile, rm, unlink, writeFile } from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { VideoQualityType } from '../enums';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { VideoQualityService } from '../video-quality/video-quality.service';
import {
  ConversionResultDto,
  ConversionStatus,
  ConversionStatusDto,
} from './dto/conversion-status.dto';
import { HLSConverter } from './hls-converter';

interface ConversionJob {
  jobId: string;
  status: ConversionStatus;
  progress: number;
  currentQuality?: VideoQualityType;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  animeId: string;
  episodeId: string;
}

@Injectable()
export class VideoProcessorService {
  private readonly logger = new Logger(VideoProcessorService.name);
  private readonly converter = new HLSConverter();
  private readonly jobs = new Map<string, ConversionJob>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
    private readonly videoQuality: VideoQualityService,
  ) {}

  /**
   * Конвертация и загрузка видео из локального файла
   */
  async convertAndUpload(
    inputPath: string,
    animeId: string,
    episodeId: string,
    qualities: VideoQualityType[],
  ): Promise<ConversionResultDto> {
    const jobId = this.createJobId();
    this.logger.log(
      `Starting conversion job ${jobId}: ${inputPath} -> ${qualities.join(', ')}`,
    );

    // Создание записи о задаче
    this.jobs.set(jobId, {
      jobId,
      status: ConversionStatus.PROCESSING,
      progress: 0,
      startedAt: new Date(),
      animeId,
      episodeId,
    });

    try {
      // Проверка существования эпизода
      const episode = await this.prisma.episode.findUnique({
        where: { id: episodeId },
        include: { anime: true },
      });

      if (!episode) {
        throw new NotFoundException(`Episode ${episodeId} not found`);
      }

      if (episode.animeId !== animeId) {
        throw new Error(
          `Episode ${episodeId} does not belong to anime ${animeId}`,
        );
      }

      // Создание временной директории для вывода
      const tempDir = path.join(os.tmpdir(), `hls_${jobId}`);
      this.logger.log(`Temp directory: ${tempDir}`);

      // Конвертация видео
      this.updateJobProgress(jobId, 10, undefined, 'Converting video...');
      const conversionResult = await this.converter.convertToHLS(
        inputPath,
        tempDir,
        qualities,
        10, // segment duration
      );

      this.logger.log(
        `Conversion completed: ${conversionResult.results.length} qualities`,
      );

      // Загрузка в S3
      this.updateJobProgress(jobId, 50, undefined, 'Uploading to S3...');
      await this.uploadToS3(
        animeId,
        episodeId,
        tempDir,
        conversionResult.results,
      );

      // Загрузка master playlist
      this.updateJobProgress(
        jobId,
        80,
        undefined,
        'Uploading master playlist...',
      );
      const masterPlaylistContent = await readFile(
        conversionResult.masterPlaylistPath,
        'utf8',
      );
      const masterPlaylistResult = await this.s3.uploadHLSPlaylist(
        Buffer.from(masterPlaylistContent),
        animeId,
        episodeId,
        undefined,
        'master',
      );

      // Создание записей в БД
      this.updateJobProgress(jobId, 90, undefined, 'Updating database...');
      let totalSize = 0;
      for (const result of conversionResult.results) {
        await this.videoQuality.create(episodeId, {
          quality: result.quality,
          fileSize: result.fileSize,
        });
        totalSize += result.fileSize;
      }

      // Обновление duration в Episode
      await this.prisma.episode.update({
        where: { id: episodeId },
        data: { duration: conversionResult.duration },
      });

      // Очистка временных файлов
      this.updateJobProgress(jobId, 95, undefined, 'Cleaning up...');
      await this.cleanupTempDir(tempDir);

      // Завершение задачи
      this.updateJobProgress(jobId, 100, undefined, 'Completed');
      this.jobs.get(jobId)!.status = ConversionStatus.COMPLETED;
      this.jobs.get(jobId)!.completedAt = new Date();

      this.logger.log(`Conversion job ${jobId} completed successfully`);

      return {
        jobId,
        animeId,
        episodeId,
        qualities,
        masterPlaylistUrl: masterPlaylistResult.url,
        duration: conversionResult.duration,
        totalSize,
      };
    } catch (error) {
      this.logger.error(`Conversion job ${jobId} failed:`, error);
      this.jobs.get(jobId)!.status = ConversionStatus.FAILED;
      this.jobs.get(jobId)!.error =
        error instanceof Error ? error.message : 'Unknown error';
      this.jobs.get(jobId)!.completedAt = new Date();
      throw error;
    }
  }

  /**
   * Конвертация из буфера (для загрузки через API)
   */
  async convertFromBuffer(
    buffer: Buffer,
    animeId: string,
    episodeId: string,
    qualities: VideoQualityType[],
  ): Promise<ConversionResultDto> {
    const jobId = this.createJobId();
    const tempInputPath = path.join(os.tmpdir(), `input_${jobId}.mp4`);

    try {
      // Сохранение буфера во временный файл
      await writeFile(tempInputPath, buffer);
      this.logger.log(`Saved input buffer to ${tempInputPath}`);

      // Конвертация
      const result = await this.convertAndUpload(
        tempInputPath,
        animeId,
        episodeId,
        qualities,
      );

      // Удаление временного входного файла
      await unlink(tempInputPath);

      return result;
    } catch (error) {
      // Очистка при ошибке
      if (fs.existsSync(tempInputPath)) {
        await unlink(tempInputPath);
      }
      throw error;
    }
  }

  /**
   * Получение статуса конвертации
   */
  getConversionStatus(jobId: string): ConversionStatusDto {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new NotFoundException(`Conversion job ${jobId} not found`);
    }

    return {
      jobId: job.jobId,
      status: job.status,
      progress: job.progress,
      currentQuality: job.currentQuality,
      error: job.error,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }

  /**
   * Загрузка результатов конвертации в S3
   */
  private async uploadToS3(
    animeId: string,
    episodeId: string,
    tempDir: string,
    results: Array<{
      quality: VideoQualityType;
      playlistPath: string;
      segments: string[];
    }>,
  ): Promise<void> {
    for (const result of results) {
      this.logger.log(`Uploading quality ${result.quality} to S3...`);

      // Загрузка сегментов
      for (let i = 0; i < result.segments.length; i++) {
        const segmentPath = result.segments[i];
        const segmentBuffer = await readFile(segmentPath);
        await this.s3.uploadHLSSegment(
          segmentBuffer,
          animeId,
          episodeId,
          result.quality,
          i,
        );
      }

      // Загрузка playlist
      const playlistBuffer = await readFile(result.playlistPath);
      await this.s3.uploadHLSPlaylist(
        playlistBuffer,
        animeId,
        episodeId,
        result.quality,
        'quality',
      );

      this.logger.log(
        `Uploaded ${result.segments.length} segments for ${result.quality}`,
      );
    }
  }

  /**
   * Очистка временной директории
   */
  private async cleanupTempDir(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) return;

    try {
      await rm(dirPath, { recursive: true, force: true });
      this.logger.log(`Cleaned up temp directory: ${dirPath}`);
    } catch (error) {
      this.logger.warn(`Failed to cleanup temp directory ${dirPath}:`, error);
    }
  }

  /**
   * Обновление прогресса задачи
   */
  private updateJobProgress(
    jobId: string,
    progress: number,
    currentQuality?: VideoQualityType,
    message?: string,
  ): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = progress;
      if (currentQuality) {
        job.currentQuality = currentQuality;
      }
      if (message) {
        this.logger.log(`[${jobId}] ${message} (${progress}%)`);
      }
    }
  }

  /**
   * Создание уникального ID задачи
   */
  private createJobId(): string {
    return `job_${uuidv4().replace(/-/g, '')}`;
  }

  /**
   * Очистка старых задач из памяти (вызывается автоматически каждые 6 часов)
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  cleanupOldJobs(maxAge: number = 3600000): number {
    const now = Date.now();
    let cleaned = 0;
    const JOB_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 часа

    for (const [jobId, job] of this.jobs.entries()) {
      const jobAge = now - job.startedAt.getTime();

      // Помечаем зависшие задачи как failed (в PROCESSING больше 4 часов)
      if (
        job.status === ConversionStatus.PROCESSING &&
        jobAge > JOB_TIMEOUT_MS
      ) {
        job.status = ConversionStatus.FAILED;
        job.error = 'Job timed out after 4 hours';
        job.completedAt = new Date();
        this.logger.warn(`Job ${jobId} marked as timed out`);
      }

      // Удаляем завершённые задачи старше maxAge
      if (
        job.completedAt &&
        now - job.completedAt.getTime() > maxAge &&
        (job.status === ConversionStatus.COMPLETED ||
          job.status === ConversionStatus.FAILED)
      ) {
        this.jobs.delete(jobId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} old conversion jobs`);
    }

    return cleaned;
  }
}
