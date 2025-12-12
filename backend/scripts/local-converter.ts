#!/usr/bin/env node

import { NestFactory } from '@nestjs/core';
import { Command } from 'commander';
import * as path from 'path';
import { AppModule } from '../src/app.module';
import { VideoQualityType } from '../src/enums';
import { VideoProcessorService } from '../src/video-processor/video-processor.service';

/**
 * Локальный CLI скрипт для конвертации MP4 в HLS
 *
 * Использование:
 * npm run convert -- --input ./video.mp4 --anime-id xxx --episode-id yyy --qualities 360p,480p,720p,1080p
 */

interface CliOptions {
  input: string;
  animeId: string;
  episodeId: string;
  qualities: string;
  output?: string;
}

// Маппинг строк в enum
const QUALITY_MAP: Record<string, VideoQualityType> = {
  '360p': VideoQualityType.Q_360P,
  '480p': VideoQualityType.Q_480P,
  '720p': VideoQualityType.Q_720P,
  '1080p': VideoQualityType.Q_1080P,
};

async function main() {
  const program = new Command();

  program
    .name('local-converter')
    .description('Конвертация MP4 видео в HLS формат и загрузка в S3')
    .version('1.0.0')
    .requiredOption('-i, --input <path>', 'Путь к входному MP4 файлу')
    .requiredOption('-a, --anime-id <id>', 'ID аниме (UUID)')
    .requiredOption('-e, --episode-id <id>', 'ID эпизода (UUID)')
    .requiredOption(
      '-q, --qualities <list>',
      'Список качеств через запятую (360p,480p,720p,1080p)',
    )
    .option(
      '-o, --output <path>',
      'Путь для временного хранения (по умолчанию системная временная директория)',
    )
    .parse(process.argv);

  const options = program.opts<CliOptions>();

  // Валидация входных параметров
  if (!options.input) {
    console.error('❌ Ошибка: не указан входной файл (--input)');
    process.exit(1);
  }

  if (!options.animeId) {
    console.error('❌ Ошибка: не указан ID аниме (--anime-id)');
    process.exit(1);
  }

  if (!options.episodeId) {
    console.error('❌ Ошибка: не указан ID эпизода (--episode-id)');
    process.exit(1);
  }

  if (!options.qualities) {
    console.error('❌ Ошибка: не указаны качества (--qualities)');
    process.exit(1);
  }

  // Парсинг качеств
  const qualityStrings = options.qualities
    .split(',')
    .map((q) => q.trim().toLowerCase());
  const qualities: VideoQualityType[] = [];

  for (const qualityStr of qualityStrings) {
    const quality = QUALITY_MAP[qualityStr];
    if (!quality) {
      console.error(
        `❌ Ошибка: неверное качество "${qualityStr}". Доступные: 360p, 480p, 720p, 1080p`,
      );
      process.exit(1);
    }
    qualities.push(quality);
  }

  // Нормализация пути к входному файлу
  const inputPath = path.resolve(options.input);

  console.log('🎬 Локальная конвертация видео в HLS');
  console.log('=====================================');
  console.log(`📁 Входной файл: ${inputPath}`);
  console.log(`🆔 Anime ID: ${options.animeId}`);
  console.log(`🆔 Episode ID: ${options.episodeId}`);
  console.log(`🎯 Качества: ${qualities.join(', ')}`);
  console.log('=====================================\n');

  try {
    // Создание NestJS приложения
    console.log('🚀 Инициализация NestJS приложения...');
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Получение сервиса конвертации
    const videoProcessor = app.get(VideoProcessorService);

    // Запуск конвертации
    console.log('⏳ Начинаем конвертацию...\n');
    const startTime = Date.now();

    const result = await videoProcessor.convertAndUpload(
      inputPath,
      options.animeId,
      options.episodeId,
      qualities,
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ Конвертация завершена успешно!');
    console.log('=====================================');
    console.log(`⏱️  Время: ${duration}s`);
    console.log(`🆔 Job ID: ${result.jobId}`);
    console.log(`🎥 Длительность видео: ${result.duration}s`);
    console.log(`📦 Общий размер: ${formatBytes(result.totalSize)}`);
    console.log(`🎯 Качества: ${result.qualities.join(', ')}`);
    console.log(`🔗 Master Playlist: ${result.masterPlaylistUrl}`);
    console.log('=====================================\n');

    // Закрытие приложения
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Ошибка конвертации:');
    console.error(error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

function formatBytes(bytes: number): string {
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

// Запуск скрипта
main();
