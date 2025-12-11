import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
} from 'class-validator';

export class UploadFileDto {
  @ApiProperty({
    example: 'anime/123/cover.jpg',
    description: 'Путь (ключ) файла в S3',
  })
  @IsString()
  @IsNotEmpty({ message: 'Путь к файлу обязателен' })
  @Matches(/^[a-zA-Z0-9_\-/.]+$/, {
    message: 'Путь может содержать только буквы, цифры, _, -, / и .',
  })
  key: string;

  @ApiPropertyOptional({
    example: 'image/jpeg',
    description: 'MIME тип файла (определяется автоматически если не указан)',
  })
  @IsString()
  @IsOptional()
  contentType?: string;
}

export class UploadFileResponseDto {
  @ApiProperty({ example: 'anime/123/cover.jpg' })
  key: string;

  @ApiProperty({ example: 'https://cdn.aniveil.ru/anime/123/cover.jpg' })
  url: string;

  @ApiProperty({ example: 'd41d8cd98f00b204e9800998ecf8427e' })
  etag: string;
}

export class GeneratePresignedPostDto {
  @ApiProperty({
    example: 'anime/123/episode/1/original.mp4',
    description: 'Путь (ключ) файла в S3',
  })
  @IsString()
  @IsNotEmpty({ message: 'Путь к файлу обязателен' })
  @Matches(/^[a-zA-Z0-9_\-/.]+$/, {
    message: 'Путь может содержать только буквы, цифры, _, -, / и .',
  })
  key: string;

  @ApiProperty({
    example: 'video/mp4',
    description: 'MIME тип файла',
  })
  @IsString()
  @IsNotEmpty({ message: 'Content-Type обязателен' })
  contentType: string;

  @ApiPropertyOptional({
    example: 10737418240,
    description: 'Максимальный размер файла в байтах (по умолчанию 10GB)',
    default: 10737418240,
  })
  @IsInt()
  @IsPositive()
  @Max(10737418240, { message: 'Максимум 10GB' })
  @IsOptional()
  maxSizeBytes?: number;

  @ApiPropertyOptional({
    example: 3600,
    description: 'Время жизни URL в секундах (по умолчанию 3600)',
    default: 3600,
  })
  @IsInt()
  @IsPositive()
  @Max(604800, { message: 'Максимум 7 дней (604800 секунд)' })
  @IsOptional()
  expiresInSeconds?: number;
}

export class PresignedPostResponseDto {
  @ApiProperty({ example: 'https://s3.storage.selcloud.ru/bucket-name' })
  url: string;

  @ApiProperty({
    example: {
      key: 'anime/123/episode/1/original.mp4',
      'Content-Type': 'video/mp4',
      Policy: 'base64-encoded-policy',
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': 'credentials',
      'X-Amz-Date': '20240101T000000Z',
      'X-Amz-Signature': 'signature',
    },
    description: 'Поля для FormData при загрузке',
  })
  fields: Record<string, string>;

  @ApiProperty({ example: 'anime/123/episode/1/original.mp4' })
  key: string;

  @ApiProperty({ example: 3600 })
  expiresIn: number;
}
