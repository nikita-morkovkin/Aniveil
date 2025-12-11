import { HttpException, HttpStatus } from '@nestjs/common';

export class S3Exception extends HttpException {
  constructor(message: string, statusCode = HttpStatus.INTERNAL_SERVER_ERROR) {
    super(message, statusCode);
  }
}

export class FileNotFoundException extends S3Exception {
  constructor(key: string) {
    super(`Файл не найден: ${key}`, HttpStatus.NOT_FOUND);
  }
}

export class UploadFailedException extends S3Exception {
  constructor(key: string, reason?: string) {
    super(
      `Ошибка загрузки файла: ${key}${reason ? ` (${reason})` : ''}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class DeleteFailedException extends S3Exception {
  constructor(key: string, reason?: string) {
    super(
      `Ошибка удаления файла: ${key}${reason ? ` (${reason})` : ''}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class InvalidFileTypeException extends S3Exception {
  constructor(actualType: string, allowedTypes: string[]) {
    super(
      `Недопустимый тип файла: ${actualType}. Разрешены: ${allowedTypes.join(', ')}`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class FileSizeExceededException extends S3Exception {
  constructor(actualSize: number, maxSize: number) {
    const formatSize = (bytes: number) => {
      if (bytes >= 1024 * 1024 * 1024)
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
      if (bytes >= 1024 * 1024)
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
      return `${(bytes / 1024).toFixed(1)} KB`;
    };

    super(
      `Размер файла ${formatSize(actualSize)} превышает лимит ${formatSize(maxSize)}`,
      HttpStatus.PAYLOAD_TOO_LARGE,
    );
  }
}
