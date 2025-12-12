import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Genre, Tag } from '../../enums';

export class AnimeFilterDto {
  @ApiPropertyOptional({
    description: 'Поиск по названию или оригинальному названию',
    example: 'Hero',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: Genre,
    isArray: true,
    description: 'Фильтр по жанрам. Можно передать одно значение или массив',
    example: ['ACTION', 'COMEDY'],
  })
  @IsOptional()
  @Transform(({ value }): Genre[] | undefined => {
    if (!value) return undefined;
    return Array.isArray(value) ? (value as Genre[]) : [value as Genre];
  })
  @IsArray()
  @IsIn(Object.values(Genre), { each: true })
  genres?: Genre[];

  @ApiPropertyOptional({
    enum: Tag,
    isArray: true,
    description: 'Фильтр по тегам. Можно передать одно значение или массив',
    example: ['SCHOOL', 'MAGIC'],
  })
  @IsOptional()
  @Transform(({ value }): Tag[] | undefined => {
    if (!value) return undefined;
    return Array.isArray(value) ? (value as Tag[]) : [value as Tag];
  })
  @IsArray()
  @IsIn(Object.values(Tag), { each: true })
  tags?: Tag[];

  @ApiPropertyOptional({
    description: 'Номер страницы',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Количество элементов на странице',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
