import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class GetUrlDto {
  @ApiProperty({
    example: 'anime/123/cover.jpg',
    description: 'Путь (ключ) файла',
  })
  @IsString()
  @IsNotEmpty({ message: 'Путь к файлу обязателен' })
  @Matches(/^[a-zA-Z0-9_\-/.]+$/, {
    message: 'Путь может содержать только буквы, цифры, _, -, / и .',
  })
  key: string;
}

export class GetSignedUrlDto extends GetUrlDto {
  @ApiPropertyOptional({
    example: 3600,
    description: 'Время жизни URL в секундах (по умолчанию 3600, макс. 604800)',
    default: 3600,
  })
  @IsInt()
  @IsOptional()
  @Min(60, { message: 'Минимум 60 секунд' })
  @Max(604800, { message: 'Максимум 7 дней (604800 секунд)' })
  expiresIn?: number;
}

export class GetUrlResponseDto {
  @ApiProperty({ example: 'https://cdn.aniveil.ru/anime/123/cover.jpg' })
  url: string;
}

export class FileExistsResponseDto {
  @ApiProperty({ example: 'anime/123/cover.jpg' })
  key: string;

  @ApiProperty({ example: true })
  exists: boolean;
}

export class FileMetadataResponseDto {
  @ApiProperty({ example: 'anime/123/cover.jpg' })
  key: string;

  @ApiProperty({ example: 102400 })
  size: number;

  @ApiProperty({ example: 'image/jpeg' })
  contentType: string;

  @ApiProperty({ example: 'd41d8cd98f00b204e9800998ecf8427e' })
  etag: string;

  @ApiProperty({ example: '2024-01-15T10:30:00.000Z' })
  lastModified: Date;
}
