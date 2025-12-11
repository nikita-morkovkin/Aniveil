import { SetMetadata } from '@nestjs/common';

export const ALLOWED_FILE_TYPES_KEY = 'allowedFileTypes';
export const MAX_FILE_SIZE_KEY = 'maxFileSize';

/**
 * Декоратор для указания разрешённых MIME типов
 *
 * @example
 * @AllowedFileTypes('image/jpeg', 'image/png', 'image/webp')
 * @UseGuards(FileTypeGuard)
 * uploadImage(@UploadedFile() file: Express.Multer.File) {}
 */
export const AllowedFileTypes = (...types: string[]) =>
  SetMetadata(ALLOWED_FILE_TYPES_KEY, types);

/**
 * Декоратор для указания максимального размера файла в байтах
 *
 * @example
 * @MaxFileSize(5 * 1024 * 1024) // 5MB
 * @UseGuards(FileSizeGuard)
 * uploadImage(@UploadedFile() file: Express.Multer.File) {}
 */
export const MaxFileSize = (bytes: number) =>
  SetMetadata(MAX_FILE_SIZE_KEY, bytes);
