import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Genre, Tag } from '../../enums';

export class CreateAnimeDto {
  @ApiProperty({
    description: 'Название аниме',
    example: 'Моя геройская академия',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Оригинальное название аниме (если есть)',
    example: 'Boku no Hero Academia',
    required: false,
  })
  @IsOptional()
  @IsString()
  titleOriginal?: string;

  @ApiProperty({ description: 'Slug для URL', example: 'my-hero-academia' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({
    description: 'Описание аниме',
    example: 'Мощное аниме про супергероев...',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Файл постера',
    required: false,
  })
  @IsOptional()
  poster?: Express.Multer.File;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Файл баннера',
    required: false,
  })
  @IsOptional()
  banner?: Express.Multer.File;

  @ApiProperty({
    enum: Genre,
    isArray: true,
    description: 'Жанры аниме',
    example: ['ACTION', 'ADVENTURE'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  genres?: Genre[];

  @ApiProperty({
    enum: Tag,
    isArray: true,
    description: 'Теги аниме',
    example: ['SCHOOL', 'SUPER_POWER'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  tags?: Tag[];
}




