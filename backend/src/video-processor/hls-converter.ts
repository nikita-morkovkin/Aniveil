import { Logger } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { VideoQualityType } from '../enums';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

interface QualityConfig {
  width: number;
  height: number;
  bitrate: string;
  maxrate: string;
  bufsize: string;
  bandwidth: number;
}

const QUALITY_CONFIG: Record<VideoQualityType, QualityConfig> = {
  Q_360P: {
    width: 640,
    height: 360,
    bitrate: '800k',
    maxrate: '856k',
    bufsize: '1200k',
    bandwidth: 928000,
  },
  Q_480P: {
    width: 854,
    height: 480,
    bitrate: '1400k',
    maxrate: '1498k',
    bufsize: '2100k',
    bandwidth: 1528000,
  },
  Q_720P: {
    width: 1280,
    height: 720,
    bitrate: '2800k',
    maxrate: '2996k',
    bufsize: '4200k',
    bandwidth: 2928000,
  },
  Q_1080P: {
    width: 1920,
    height: 1080,
    bitrate: '5000k',
    maxrate: '5350k',
    bufsize: '7500k',
    bandwidth: 5128000,
  },
};

export interface ConversionResult {
  quality: VideoQualityType;
  playlistPath: string;
  segments: string[];
  fileSize: number;
}

export interface VideoInfo {
  duration: number;
  width: number;
  height: number;
  bitrate: number;
  codec: string;
  fps: number;
}

export class HLSConverter {
  private readonly logger = new Logger(HLSConverter.name);

  /**
   * Получение информации о видео
   */
  async getVideoInfo(inputPath: string): Promise<VideoInfo> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err: Error | null, metadata) => {
        if (err) {
          reject(new Error(`Failed to get video info: ${err.message}`));
          return;
        }

        const videoStream = metadata.streams.find(
          (s) => s.codec_type === 'video',
        );
        if (!videoStream) {
          reject(new Error('No video stream found'));
          return;
        }

        resolve({
          duration: metadata.format.duration || 0,
          width: videoStream.width || 0,
          height: videoStream.height || 0,
          bitrate: metadata.format.bit_rate
            ? parseInt(String(metadata.format.bit_rate), 10)
            : 0,
          codec: videoStream.codec_name || 'unknown',
          fps: this.parseFps(videoStream.r_frame_rate),
        });
      });
    });
  }

  /**
   * Получение длительности видео в секундах
   */
  async getVideoDuration(inputPath: string): Promise<number> {
    const info = await this.getVideoInfo(inputPath);
    return Math.floor(info.duration);
  }

  /**
   * Конвертация видео в HLS с несколькими качествами
   */
  async convertToHLS(
    inputPath: string,
    outputDir: string,
    qualities: VideoQualityType[],
    segmentDuration = 10,
  ): Promise<{
    results: ConversionResult[];
    masterPlaylistPath: string;
    duration: number;
  }> {
    this.logger.log(
      `Starting HLS conversion: ${inputPath} -> ${outputDir} (qualities: ${qualities.join(', ')})`,
    );

    // Проверка существования входного файла
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    // Создание выходной директории
    await this.ensureDir(outputDir);

    // Получение информации о видео
    const videoInfo = await this.getVideoInfo(inputPath);
    this.logger.log(
      `Video info: ${videoInfo.width}x${videoInfo.height}, ${videoInfo.duration}s, ${videoInfo.codec}`,
    );

    // Конвертация каждого качества
    const results: ConversionResult[] = [];
    for (const quality of qualities) {
      try {
        const result = await this.convertQuality(
          inputPath,
          outputDir,
          quality,
          segmentDuration,
        );
        results.push(result);
        this.logger.log(
          `Quality ${quality} converted: ${result.segments.length} segments, ${this.formatBytes(result.fileSize)}`,
        );
      } catch (error) {
        this.logger.error(`Failed to convert quality ${quality}:`, error);
        throw error;
      }
    }

    // Генерация master playlist
    const masterPlaylistPath = await this.generateMasterPlaylist(
      results,
      outputDir,
    );

    return {
      results,
      masterPlaylistPath,
      duration: Math.floor(videoInfo.duration),
    };
  }

  /**
   * Конвертация одного качества
   */
  async convertQuality(
    inputPath: string,
    outputDir: string,
    quality: VideoQualityType,
    segmentDuration: number,
  ): Promise<ConversionResult> {
    const config = QUALITY_CONFIG[quality];
    const qualityDir = path.join(outputDir, quality);
    await this.ensureDir(qualityDir);

    const playlistPath = path.join(qualityDir, 'playlist.m3u8');
    const segmentPattern = path.join(qualityDir, 'segment-%03d.ts');

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .addOption('-preset', 'medium')
        .addOption('-crf', '23')
        .addOption('-vf', `scale=${config.width}:${config.height}`)
        .addOption('-b:v', config.bitrate)
        .addOption('-maxrate', config.maxrate)
        .addOption('-bufsize', config.bufsize)
        .addOption('-b:a', '128k')
        .addOption('-hls_time', segmentDuration.toString())
        .addOption('-hls_playlist_type', 'vod')
        .addOption('-hls_segment_filename', segmentPattern)
        .output(playlistPath)
        .on('start', (commandLine: string) => {
          this.logger.debug(`FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress: { percent?: number }) => {
          if (progress.percent) {
            this.logger.debug(
              `${quality} conversion progress: ${progress.percent.toFixed(1)}%`,
            );
          }
        })
        .on('end', () => {
          void (async () => {
            try {
              const segments = await this.getSegments(qualityDir);
              const fileSize = await this.calculateDirSize(qualityDir);
              resolve({
                quality,
                playlistPath,
                segments,
                fileSize,
              });
            } catch (error) {
              reject(
                error instanceof Error
                  ? error
                  : new Error('Unknown error during segment processing'),
              );
            }
          })();
        })
        .on('error', (err: Error) => {
          reject(new Error(`FFmpeg error (${quality}): ${err.message}`));
        })
        .run();
    });
  }

  /**
   * Генерация master playlist с adaptive bitrate
   */
  async generateMasterPlaylist(
    results: ConversionResult[],
    outputDir: string,
  ): Promise<string> {
    const masterPlaylistPath = path.join(outputDir, 'master.m3u8');

    let content = '#EXTM3U\n#EXT-X-VERSION:3\n';

    // Сортировка по качеству (от меньшего к большему)
    const sortedResults = [...results].sort((a, b) => {
      const orderA = this.getQualityOrder(a.quality);
      const orderB = this.getQualityOrder(b.quality);
      return orderA - orderB;
    });

    for (const result of sortedResults) {
      const config = QUALITY_CONFIG[result.quality];
      content += `#EXT-X-STREAM-INF:BANDWIDTH=${config.bandwidth},RESOLUTION=${config.width}x${config.height}\n`;
      content += `${result.quality}/playlist.m3u8\n`;
    }

    await writeFile(masterPlaylistPath, content, 'utf8');
    this.logger.log(`Master playlist generated: ${masterPlaylistPath}`);

    return masterPlaylistPath;
  }

  /**
   * Получение списка сегментов из директории
   */
  private async getSegments(qualityDir: string): Promise<string[]> {
    const files = await readdir(qualityDir);
    return files
      .filter((file) => file.endsWith('.ts'))
      .sort()
      .map((file) => path.join(qualityDir, file));
  }

  /**
   * Расчет размера директории
   */
  private async calculateDirSize(dirPath: string): Promise<number> {
    const files = await readdir(dirPath);
    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = await stat(filePath);
      totalSize += stats.size;
    }

    return totalSize;
  }

  /**
   * Создание директории, если она не существует
   */
  private async ensureDir(dirPath: string): Promise<void> {
    if (!fs.existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Парсинг FPS из строки (например "30/1" -> 30)
   */
  private parseFps(fpsString?: string): number {
    if (!fpsString) return 0;
    const parts = fpsString.split('/');
    if (parts.length === 2) {
      return parseInt(parts[0], 10) / parseInt(parts[1], 10);
    }
    return parseFloat(fpsString);
  }

  /**
   * Получение порядка качества для сортировки
   */
  private getQualityOrder(quality: VideoQualityType): number {
    const order: Record<VideoQualityType, number> = {
      Q_360P: 1,
      Q_480P: 2,
      Q_720P: 3,
      Q_1080P: 4,
    };
    return order[quality];
  }

  /**
   * Форматирование размера файла
   */
  private formatBytes(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(2)} KB`;
    }
    return `${bytes} B`;
  }
}
