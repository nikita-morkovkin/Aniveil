import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsString,
  Matches,
} from 'class-validator';

export class DeleteFileDto {
  @ApiProperty({
    example: 'anime/123/cover.jpg',
    description: 'Путь (ключ) файла для удаления',
  })
  @IsString()
  @IsNotEmpty({ message: 'Путь к файлу обязателен' })
  @Matches(/^[a-zA-Z0-9_\-/.]+$/, {
    message: 'Путь может содержать только буквы, цифры, _, -, / и .',
  })
  key: string;
}

export class DeleteBatchDto {
  @ApiProperty({
    example: ['anime/123/cover.jpg', 'anime/123/cover-thumb.jpg'],
    description: 'Массив ключей файлов для удаления (макс. 1000)',
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(1000, { message: 'Максимум 1000 файлов за раз' })
  keys: string[];
}

export class DeleteByPrefixDto {
  @ApiProperty({
    example: 'anime/123/episodes/1/',
    description: 'Префикс для удаления всех файлов',
  })
  @IsString()
  @IsNotEmpty({ message: 'Префикс обязателен' })
  @Matches(/^[a-zA-Z0-9_\-/]+\/$/, {
    message:
      'Префикс должен заканчиваться на / и содержать только буквы, цифры, _, -, /',
  })
  prefix: string;
}

export class DeleteResultDto {
  @ApiProperty({ example: ['anime/123/cover.jpg'] })
  deleted: string[];

  @ApiProperty({ example: [] })
  errors: string[];
}
