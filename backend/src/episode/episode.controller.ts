import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public, Roles } from '../auth/decorators';
import { Role } from '../enums';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { EpisodeResponseDto } from './dto/episode-response.dto';
import { UpdateEpisodeDto } from './dto/update-episode.dto';
import { EpisodeService } from './episode.service';

@ApiTags('Episodes - By Anime')
@Controller('anime')
export class EpisodeController {
  constructor(private readonly episodeService: EpisodeService) {}

  @Post(':animeId/episodes')
  @Roles(Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать новый эпизод для аниме' })
  @ApiResponse({
    status: 201,
    description: 'Эпизод успешно создан.',
    type: EpisodeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Неверный запрос.' })
  async create(
    @Param('animeId') animeId: string,
    @Body() createEpisodeDto: CreateEpisodeDto,
  ) {
    const episode = await this.episodeService.create(animeId, createEpisodeDto);
    return new EpisodeResponseDto(episode);
  }

  @Public()
  @Get(':animeId/episodes')
  @ApiOperation({ summary: 'Получить список эпизодов для аниме' })
  @ApiResponse({
    status: 200,
    description: 'Список эпизодов успешно получен.',
    type: [EpisodeResponseDto],
  })
  async findAll(@Param('animeId') animeId: string) {
    const episodes = await this.episodeService.findAll(animeId);
    return episodes.map((episode) => new EpisodeResponseDto(episode));
  }
}

@ApiTags('Episodes - By ID')
@Controller('episodes')
export class EpisodeByIdController {
  constructor(private readonly episodeService: EpisodeService) {}

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Получить детали эпизода по ID' })
  @ApiResponse({
    status: 200,
    description: 'Детали эпизода успешно получены.',
    type: EpisodeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Эпизод не найден.' })
  async findOne(@Param('id') id: string) {
    const episode = await this.episodeService.findOne(id);
    return new EpisodeResponseDto(episode);
  }

  @Patch(':id')
  @Roles(Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить эпизод по ID' })
  @ApiResponse({
    status: 200,
    description: 'Эпизод успешно обновлен.',
    type: EpisodeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Эпизод не найден.' })
  async update(
    @Param('id') id: string,
    @Body() updateEpisodeDto: UpdateEpisodeDto,
  ) {
    const episode = await this.episodeService.update(id, updateEpisodeDto);
    return new EpisodeResponseDto(episode);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить эпизод по ID' })
  @ApiResponse({ status: 204, description: 'Эпизод успешно удален.' })
  @ApiResponse({ status: 404, description: 'Эпизод не найден.' })
  remove(@Param('id') id: string) {
    return this.episodeService.remove(id);
  }
}
