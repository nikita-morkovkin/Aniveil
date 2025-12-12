import { PartialType } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Genre, Tag } from '../../enums';
import { CreateAnimeDto } from './create-anime.dto';

export class UpdateAnimeDto extends PartialType(CreateAnimeDto) {
  genres?: Genre[];
  tags?: Tag[];

  @IsOptional()
  @IsInt()
  @Min(0)
  episodesCount?: number;
}
