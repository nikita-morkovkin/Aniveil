import { VideoQualityType } from '@prisma/client';

/** Маппинг Prisma enum → строка для пути */
export const QualityToPath: Record<VideoQualityType, string> = {
  Q_360P: '360p',
  Q_480P: '480p',
  Q_720P: '720p',
  Q_1080P: '1080p',
};

/** Разрешённые MIME типы для загрузки видео */
export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/x-matroska',
  'video/x-msvideo',
  'video/webm',
] as const;

/** Разрешённые MIME типы для изображений */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

/** Хелперы для построения путей в S3 */
export const StoragePath = {
  /** anime/{animeId} */
  anime: (animeId: string) => `anime/${animeId}`,

  /** anime/{animeId}/cover.jpg */
  animeCover: (animeId: string) => `anime/${animeId}/cover.jpg`,

  /** anime/{animeId}/cover-thumb.jpg */
  animeCoverThumb: (animeId: string) => `anime/${animeId}/cover-thumb.jpg`,

  /** anime/{animeId}/episodes */
  episodes: (animeId: string) => `anime/${animeId}/episodes`,

  /** anime/{animeId}/episodes/{episodeId} */
  episode: (animeId: string, episodeId: string) =>
    `anime/${animeId}/episodes/${episodeId}`,

  /** anime/{animeId}/episodes/{episodeId}/master.m3u8 */
  masterPlaylist: (animeId: string, episodeId: string) =>
    `anime/${animeId}/episodes/${episodeId}/master.m3u8`,

  /** anime/{animeId}/episodes/{episodeId}/{quality} */
  quality: (animeId: string, episodeId: string, quality: string) =>
    `anime/${animeId}/episodes/${episodeId}/${quality}`,

  /** anime/{animeId}/episodes/{episodeId}/{quality}/playlist.m3u8 */
  qualityPlaylist: (animeId: string, episodeId: string, quality: string) =>
    `anime/${animeId}/episodes/${episodeId}/${quality}/playlist.m3u8`,

  /** anime/{animeId}/episodes/{episodeId}/{quality}/segment-{index}.ts */
  segment: (
    animeId: string,
    episodeId: string,
    quality: string,
    index: number,
  ) =>
    `anime/${animeId}/episodes/${episodeId}/${quality}/segment-${index.toString().padStart(3, '0')}.ts`,

  /** anime/{animeId}/episodes/{episodeId}/thumbnails */
  thumbnails: (animeId: string, episodeId: string) =>
    `anime/${animeId}/episodes/${episodeId}/thumbnails`,

  /** anime/{animeId}/episodes/{episodeId}/thumbnails/preview-{index}.jpg */
  thumbnail: (animeId: string, episodeId: string, index: number) =>
    `anime/${animeId}/episodes/${episodeId}/thumbnails/preview-${index}.jpg`,

  /** anime/{animeId}/episodes/{episodeId}/screenshots */
  screenshots: (animeId: string, episodeId: string) =>
    `anime/${animeId}/episodes/${episodeId}/screenshots`,

  /** anime/{animeId}/episodes/{episodeId}/screenshots/screenshot-{timestamp}.jpg */
  screenshot: (animeId: string, episodeId: string, timestamp: string) =>
    `anime/${animeId}/episodes/${episodeId}/screenshots/screenshot-${timestamp}.jpg`,

  /** temp/{filename} */
  temp: (filename: string) => `temp/${filename}`,
} as const;
