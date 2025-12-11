import { Injectable, Logger } from '@nestjs/common';
import { S3CoreService } from './s3-core.service';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);

  constructor(private readonly s3Core: S3CoreService) {}

  // ==================== PROXY METHODS (For backward compatibility or convenience) ====================
  // You might want to remove these and use s3Core directly in controllers,
  // but keeping them simplifies the refactor for now.

  getPublicUrl(key: string): string {
    return this.s3Core.getPublicUrl(key);
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return this.s3Core.getSignedUrl(key, expiresIn);
  }

  async checkFileExists(key: string): Promise<boolean> {
    return this.s3Core.checkFileExists(key);
  }

  async getFileMetadata(key: string) {
    return this.s3Core.getFileMetadata(key);
  }

  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
    metadata?: Record<string, string>,
  ) {
    return this.s3Core.uploadFile(buffer, key, contentType, metadata);
  }

  async deleteFile(key: string): Promise<void> {
    return this.s3Core.deleteFile(key);
  }

  async deleteBatch(keys: string[]) {
    return this.s3Core.deleteBatch(keys);
  }

  async deleteByPrefix(prefix: string) {
    return this.s3Core.deleteByPrefix(prefix);
  }

  async listFiles(prefix: string, maxKeys = 1000) {
    return this.s3Core.listFiles(prefix, maxKeys);
  }

  async copyFile(sourceKey: string, destinationKey: string) {
    return this.s3Core.copyFile(sourceKey, destinationKey);
  }

  async moveFile(sourceKey: string, destinationKey: string) {
    return this.s3Core.moveFile(sourceKey, destinationKey);
  }

  async generatePresignedPost(
    key: string,
    contentType: string,
    maxSizeBytes?: number,
    expiresInSeconds?: number,
  ) {
    return this.s3Core.generatePresignedPost(
      key,
      contentType,
      maxSizeBytes,
      expiresInSeconds,
    );
  }

  // ==================== DOMAIN SPECIFIC METHODS ====================

  async getEpisodeFiles(animeId: string, episodeId: string) {
    const prefix = `anime/${animeId}/episodes/${episodeId}/`;
    const files = await this.s3Core.listFiles(prefix);

    const qualities: Record<
      string,
      { playlist?: string; segments: string[]; size: number }
    > = {};
    const thumbnails: string[] = [];
    const screenshots: string[] = [];
    let masterPlaylist: string | undefined;
    let totalSize = 0;

    for (const file of files) {
      totalSize += file.size;
      const relativePath = file.key.replace(prefix, '');

      if (relativePath === 'master.m3u8') {
        masterPlaylist = file.key;
      } else if (relativePath.startsWith('thumbnails/')) {
        thumbnails.push(file.key);
      } else if (relativePath.startsWith('screenshots/')) {
        screenshots.push(file.key);
      } else {
        // Quality: 360p/playlist.m3u8 or 360p/segment-000.ts
        const match = relativePath.match(/^(\d+p)\//);
        if (match) {
          const quality = match[1];
          if (!qualities[quality]) {
            qualities[quality] = { segments: [], size: 0 };
          }
          qualities[quality].size += file.size;

          if (relativePath.endsWith('playlist.m3u8')) {
            qualities[quality].playlist = file.key;
          } else if (relativePath.endsWith('.ts')) {
            qualities[quality].segments.push(file.key);
          }
        }
      }
    }

    // Sort segments
    for (const quality of Object.values(qualities)) {
      quality.segments.sort();
    }

    return {
      animeId,
      episodeId,
      masterPlaylist,
      qualities,
      thumbnails: thumbnails.sort(),
      screenshots: screenshots.sort(),
      totalSize,
      totalFiles: files.length,
    };
  }

  async getFolderSize(
    prefix: string,
  ): Promise<{ size: number; count: number }> {
    const files = await this.s3Core.listFiles(prefix);
    const size = files.reduce((sum, file) => sum + file.size, 0);
    return { size, count: files.length };
  }

  async deleteEpisode(animeId: string, episodeId: string) {
    const prefix = `anime/${animeId}/episodes/${episodeId}/`;
    const result = await this.s3Core.deleteByPrefix(prefix);
    this.logger.log(`Episode deleted: ${animeId}/${episodeId}`);
    return result;
  }

  async deleteEpisodeQuality(
    animeId: string,
    episodeId: string,
    quality: string,
  ) {
    const prefix = `anime/${animeId}/episodes/${episodeId}/${quality}/`;
    const result = await this.s3Core.deleteByPrefix(prefix);
    this.logger.log(`Quality deleted: ${animeId}/${episodeId}/${quality}`);
    return result;
  }

  async deleteAnime(animeId: string) {
    const prefix = `anime/${animeId}/`;
    const result = await this.s3Core.deleteByPrefix(prefix);
    this.logger.log(`Anime deleted: ${animeId}`);
    return result;
  }

  async getStorageStats(animeId?: string) {
    const prefix = animeId ? `anime/${animeId}/` : 'anime/';
    const files = await this.s3Core.listFiles(prefix);

    let videoSegmentsSize = 0;
    let playlistsSize = 0;
    let imagesSize = 0;
    let otherSize = 0;

    for (const file of files) {
      if (file.key.endsWith('.ts')) {
        videoSegmentsSize += file.size;
      } else if (file.key.endsWith('.m3u8')) {
        playlistsSize += file.size;
      } else if (
        file.key.endsWith('.jpg') ||
        file.key.endsWith('.png') ||
        file.key.endsWith('.webp')
      ) {
        imagesSize += file.size;
      } else {
        otherSize += file.size;
      }
    }

    const totalSize =
      videoSegmentsSize + playlistsSize + imagesSize + otherSize;

    return {
      totalSize,
      totalSizeFormatted: this.formatBytes(totalSize),
      totalFiles: files.length,
      sizeByType: {
        videoSegments: videoSegmentsSize,
        playlists: playlistsSize,
        images: imagesSize,
        other: otherSize,
      },
      animeId,
      generatedAt: new Date(),
    };
  }

  // ==================== SPECIALIZED UPLOAD METHODS ====================

  /**
   * Upload HLS segment (.ts file)
   */
  async uploadHLSSegment(
    buffer: Buffer,
    animeId: string,
    episodeId: string,
    quality: string,
    segmentIndex: number,
  ) {
    const key = `anime/${animeId}/episodes/${episodeId}/${quality}/segment-${segmentIndex.toString().padStart(3, '0')}.ts`;
    return this.s3Core.uploadFile(buffer, key, 'video/mp2t', {
      animeId,
      episodeId,
      quality,
      segmentIndex: segmentIndex.toString(),
      type: 'hls-segment',
    });
  }

  /**
   * Upload HLS playlist (.m3u8 file)
   */
  async uploadHLSPlaylist(
    buffer: Buffer,
    animeId: string,
    episodeId: string,
    quality: string | undefined,
    type: 'quality' | 'master',
  ) {
    const key =
      type === 'master'
        ? `anime/${animeId}/episodes/${episodeId}/master.m3u8`
        : `anime/${animeId}/episodes/${episodeId}/${quality}/playlist.m3u8`;

    return this.s3Core.uploadFile(
      buffer,
      key,
      'application/vnd.apple.mpegurl',
      {
        animeId,
        episodeId,
        quality: quality ?? 'master',
        type: `hls-${type}-playlist`,
      },
    );
  }

  /**
   * Upload thumbnail
   */
  async uploadThumbnail(
    buffer: Buffer,
    animeId: string,
    episodeId: string,
    index: number,
  ) {
    const key = `anime/${animeId}/episodes/${episodeId}/thumbnails/preview-${index}.jpg`;
    return this.s3Core.uploadFile(buffer, key, 'image/jpeg', {
      animeId,
      episodeId,
      index: index.toString(),
      type: 'thumbnail',
    });
  }

  /**
   * Upload anime cover
   */
  async uploadAnimeCover(
    buffer: Buffer,
    animeId: string,
    variant: 'cover' | 'cover-thumb' = 'cover',
  ) {
    const key = `anime/${animeId}/${variant}.jpg`;
    return this.s3Core.uploadFile(buffer, key, 'image/jpeg', {
      animeId,
      type: `anime-${variant}`,
    });
  }

  /**
   * Upload preview screenshot
   */
  async uploadScreenshot(
    buffer: Buffer,
    animeId: string,
    episodeId: string,
    timestamp: string,
  ) {
    const key = `anime/${animeId}/episodes/${episodeId}/screenshots/screenshot-${timestamp}.jpg`;
    return this.s3Core.uploadFile(buffer, key, 'image/jpeg', {
      animeId,
      episodeId,
      timestamp,
      type: 'screenshot',
    });
  }

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
