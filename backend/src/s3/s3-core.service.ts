import {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  type ListObjectsV2CommandOutput,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import {
  createPresignedPost,
  type PresignedPost,
} from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteFailedException,
  FileNotFoundException,
  S3Exception,
  UploadFailedException,
} from './s3.exceptions';

interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  operation?: string;
}

@Injectable()
export class S3CoreService implements OnModuleInit {
  private readonly logger = new Logger(S3CoreService.name);
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 1000;

  private s3Client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.bucket = this.configService.getOrThrow<string>('S3_BUCKET');
    this.publicUrl = this.configService.getOrThrow<string>('S3_PUBLIC_URL');

    this.s3Client = new S3Client({
      endpoint: this.configService.getOrThrow<string>('S3_ENDPOINT'),
      region: this.configService.getOrThrow<string>('S3_REGION'),
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('S3_ACCESS_KEY'),
        secretAccessKey: this.configService.getOrThrow<string>('S3_SECRET_KEY'),
      },
      forcePathStyle:
        this.configService.get<string>('S3_FORCE_PATH_STYLE') === 'true',
    });

    this.logger.log(`S3 Client initialized for bucket: ${this.bucket}`);
  }

  getBucketName(): string {
    return this.bucket;
  }

  getPublicUrlRoot(): string {
    return this.publicUrl;
  }

  getClient(): S3Client {
    return this.s3Client;
  }

  /**
   * Валидация S3 ключа для предотвращения path traversal атак
   */
  private validateKey(key: string): void {
    if (
      key.includes('..') ||
      key.startsWith('/') ||
      key.includes('//') ||
      key.includes('\0')
    ) {
      throw new S3Exception(
        'Invalid key: path traversal or invalid characters detected',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async uploadFile(
    buffer: Buffer,
    key: string,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<{ key: string; url: string; etag: string }> {
    this.validateKey(key);

    try {
      const result = await this.withRetry(
        async () => {
          const command = new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            Metadata: metadata,
          });
          return this.s3Client.send(command);
        },
        { operation: `Upload ${key}` },
      );

      this.logger.log(`File uploaded: ${key} (${buffer.length} bytes)`);

      return {
        key,
        url: this.getPublicUrl(key),
        etag: result.ETag?.replace(/"/g, '') ?? '',
      };
    } catch (error) {
      throw new UploadFailedException(key, this.getErrorMessage(error));
    }
  }

  async deleteFile(key: string): Promise<void> {
    this.validateKey(key);

    try {
      await this.withRetry(
        async () => {
          const command = new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: key,
          });
          return this.s3Client.send(command);
        },
        { operation: `Delete ${key}` },
      );

      this.logger.log(`File deleted: ${key}`);
    } catch (error) {
      throw new DeleteFailedException(key, this.getErrorMessage(error));
    }
  }

  getPublicUrl(key: string): string {
    const baseUrl = this.publicUrl.replace(/\/$/, '');
    return `${baseUrl}/${key}`;
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    this.validateKey(key);

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (error) {
      this.logger.error(
        `Failed to generate signed URL for ${key}: ${this.getErrorMessage(error)}`,
      );
      throw new S3Exception(`Error generating signed URL: ${key}`);
    }
  }

  async checkFileExists(key: string): Promise<boolean> {
    this.validateKey(key);

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  async getFileMetadata(key: string) {
    this.validateKey(key);

    try {
      const result = await this.withRetry(
        async () => {
          const command = new HeadObjectCommand({
            Bucket: this.bucket,
            Key: key,
          });
          return this.s3Client.send(command);
        },
        { operation: `GetMetadata ${key}` },
      );

      return {
        key,
        size: result.ContentLength ?? 0,
        contentType: result.ContentType ?? '',
        etag: result.ETag?.replace(/"/g, '') ?? '',
        lastModified: result.LastModified ?? new Date(),
        metadata: result.Metadata,
      };
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new FileNotFoundException(key);
      }
      throw new S3Exception(`Error retrieving metadata: ${key}`);
    }
  }

  async listFiles(prefix: string, maxKeys = 1000) {
    try {
      const files: { key: string; size: number; lastModified: Date }[] = [];
      let continuationToken: string | undefined;

      do {
        const result: ListObjectsV2CommandOutput = await this.withRetry(
          async () => {
            const command = new ListObjectsV2Command({
              Bucket: this.bucket,
              Prefix: prefix,
              MaxKeys: maxKeys,
              ContinuationToken: continuationToken,
            });
            return this.s3Client.send(command);
          },
          { operation: `ListFiles ${prefix}` },
        );

        if (result.Contents) {
          for (const item of result.Contents) {
            if (item.Key) {
              files.push({
                key: item.Key,
                size: item.Size ?? 0,
                lastModified: item.LastModified ?? new Date(),
              });
            }
          }
        }

        continuationToken = result.IsTruncated
          ? result.NextContinuationToken
          : undefined;
      } while (continuationToken);

      this.logger.debug(`Listed ${files.length} files with prefix: ${prefix}`);
      return files;
    } catch (error) {
      this.logger.error(
        `Failed to list files with prefix ${prefix}: ${this.getErrorMessage(error)}`,
      );
      throw new S3Exception(`Error listing files: ${prefix}`);
    }
  }

  async deleteBatch(
    keys: string[],
  ): Promise<{ deleted: string[]; errors: string[] }> {
    if (keys.length === 0) {
      return { deleted: [], errors: [] };
    }

    const deleted: string[] = [];
    const errors: string[] = [];

    // S3 allows deleting up to 1000 objects at once
    const chunks = this.chunkArray(keys, 1000);

    for (const chunk of chunks) {
      const command = new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: chunk.map((key) => ({ Key: key })),
          Quiet: false,
        },
      });

      const result = await this.s3Client.send(command);

      if (result.Deleted) {
        for (const item of result.Deleted) {
          if (item.Key) deleted.push(item.Key);
        }
      }

      if (result.Errors) {
        for (const item of result.Errors) {
          if (item.Key) errors.push(item.Key);
        }
      }
    }

    this.logger.log(
      `Deleted ${deleted.length} files, errors: ${errors.length}`,
    );
    return { deleted, errors };
  }

  async deleteByPrefix(
    prefix: string,
  ): Promise<{ deleted: string[]; errors: string[] }> {
    const files = await this.listFiles(prefix);
    const keys = files.map((f) => f.key);
    return this.deleteBatch(keys);
  }

  async copyFile(sourceKey: string, destinationKey: string) {
    this.validateKey(sourceKey);
    this.validateKey(destinationKey);

    try {
      const result = await this.withRetry(
        async () => {
          const command = new CopyObjectCommand({
            Bucket: this.bucket,
            CopySource: `${this.bucket}/${sourceKey}`,
            Key: destinationKey,
          });
          return this.s3Client.send(command);
        },
        { operation: `Copy ${sourceKey} -> ${destinationKey}` },
      );

      this.logger.log(`File copied: ${sourceKey} -> ${destinationKey}`);

      return {
        sourceKey,
        destinationKey,
        etag: result.CopyObjectResult?.ETag?.replace(/"/g, '') ?? '',
      };
    } catch (error) {
      if (this.isNotFoundError(error)) {
        throw new FileNotFoundException(sourceKey);
      }
      throw new S3Exception(`Error copying: ${sourceKey} -> ${destinationKey}`);
    }
  }

  async moveFile(sourceKey: string, destinationKey: string) {
    const copyResult = await this.copyFile(sourceKey, destinationKey);
    await this.deleteFile(sourceKey);

    this.logger.log(`File moved: ${sourceKey} -> ${destinationKey}`);

    return copyResult;
  }

  async generatePresignedPost(
    key: string,
    contentType: string,
    maxSizeBytes = 10 * 1024 * 1024 * 1024, // 10GB
    expiresInSeconds = 3600,
  ) {
    const presignedPost: PresignedPost = await createPresignedPost(
      this.s3Client,
      {
        Bucket: this.bucket,
        Key: key,
        Conditions: [
          ['content-length-range', 0, maxSizeBytes],
          ['eq', '$Content-Type', contentType],
        ],
        Fields: {
          'Content-Type': contentType,
        },
        Expires: expiresInSeconds,
      },
    );

    return {
      url: presignedPost.url,

      fields: presignedPost.fields,
      key,
      expiresIn: expiresInSeconds,
    };
  }

  async validateFileIntegrity(key: string, expectedEtag: string) {
    const metadata = await this.getFileMetadata(key);
    const isValid = metadata.etag === expectedEtag;

    if (!isValid) {
      this.logger.warn(
        `ETag mismatch for ${key}: expected ${expectedEtag}, got ${metadata.etag}`,
      );
    }

    return {
      key,
      isValid,
      expectedEtag,
      actualEtag: metadata.etag,
    };
  }

  async uploadBatch(
    files: Array<{
      buffer: Buffer;
      key: string;
      contentType: string;
      metadata?: Record<string, string>;
    }>,
  ): Promise<
    Array<{ key: string; url: string; etag: string; error?: string }>
  > {
    const results = await Promise.allSettled(
      files.map((file) =>
        this.uploadFile(file.buffer, file.key, file.contentType, file.metadata),
      ),
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        this.logger.error(
          `Batch upload failed for ${files[index].key}: ${this.getErrorMessage(result.reason)}`,
        );
        return {
          key: files[index].key,
          url: '',
          etag: '',
          error: this.getErrorMessage(result.reason),
        };
      }
    });
  }

  // --- Helpers ---

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private isNotFoundError(error: unknown): boolean {
    return (
      error instanceof Error &&
      'name' in error &&
      (error.name === 'NotFound' || error.name === 'NoSuchKey')
    );
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof S3ServiceException) {
      const retryableCodes = [
        'RequestTimeout',
        'ServiceUnavailable',
        'SlowDown',
        'InternalError',
        'RequestTimeTooSkewed',
      ];
      return retryableCodes.includes(error.name);
    }

    if (error instanceof Error) {
      const networkErrors = ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EPIPE'];
      return networkErrors.some(
        (code) => error.message.includes(code) || error.name.includes(code),
      );
    }

    return false;
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const {
      maxRetries = this.MAX_RETRIES,
      baseDelayMs = this.BASE_DELAY_MS,
      operation = 'S3 operation',
    } = options;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (!this.isRetryableError(error) || attempt === maxRetries) {
          this.logger.error(
            `${operation} failed after ${attempt} attempt(s): ${this.getErrorMessage(error)}`,
          );
          throw error;
        }

        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        this.logger.warn(
          `${operation} failed (attempt ${attempt}/${maxRetries}), retrying in ${delayMs}ms: ${this.getErrorMessage(error)}`,
        );

        await this.sleep(delayMs);
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
