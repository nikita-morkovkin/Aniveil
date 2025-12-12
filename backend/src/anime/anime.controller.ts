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
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public, Roles } from '../auth/decorators';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnimeService } from './anime.service';
import { AnimeFilterDto } from './dto/anime-filter.dto';
import { AnimeResponseDto } from './dto/anime-response.dto';
import { CreateAnimeDto } from './dto/create-anime.dto';
import { UpdateAnimeDto } from './dto/update-anime.dto';

@ApiTags('Anime')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('anime')
export class AnimeController {
  constructor(private readonly animeService: AnimeService) {}

  @Post()
  @Roles(Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать новое аниме' })
  @ApiResponse({
    status: 201,
    description: 'Аниме успешно создано.',
    type: AnimeResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Неверный запрос.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'poster', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
    ]),
  )
  async create(
    @Body() createAnimeDto: CreateAnimeDto,
    @UploadedFiles()
    files: { poster?: Express.Multer.File[]; banner?: Express.Multer.File[] },
  ) {
    const anime = await this.animeService.create(
      createAnimeDto,
      files.poster?.[0],
      files.banner?.[0],
    );
    return new AnimeResponseDto(anime);
  }

  @Public()
  @Get('genres')
  @ApiOperation({ summary: 'Получить список всех жанров' })
  @ApiResponse({ status: 200, description: 'Список жанров успешно получен.' })
  getGenres() {
    return this.animeService.getGenres();
  }

  @Public()
  @Get('tags')
  @ApiOperation({ summary: 'Получить список всех тегов' })
  @ApiResponse({ status: 200, description: 'Список тегов успешно получен.' })
  getTags() {
    return this.animeService.getTags();
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Получить список аниме' })
  @ApiResponse({
    status: 200,
    description: 'Список аниме успешно получен.',
    type: [AnimeResponseDto],
  })
  async findAll(@Query() filters: AnimeFilterDto) {
    const { data, total, page, limit } =
      await this.animeService.findAll(filters);
    return {
      data: data.map((anime) => new AnimeResponseDto(anime)),
      total,
      page,
      limit,
    };
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Получить детали аниме по ID' })
  @ApiResponse({
    status: 200,
    description: 'Детали аниме успешно получены.',
    type: AnimeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Аниме не найдено.' })
  async findOne(@Param('id') id: string) {
    const anime = await this.animeService.findOne(id);
    return new AnimeResponseDto(anime);
  }

  @Patch(':id')
  @Roles(Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить аниме по ID' })
  @ApiResponse({
    status: 200,
    description: 'Аниме успешно обновлено.',
    type: AnimeResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Аниме не найдено.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'poster', maxCount: 1 },
      { name: 'banner', maxCount: 1 },
    ]),
  )
  async update(
    @Param('id') id: string,
    @Body() updateAnimeDto: UpdateAnimeDto,
    @UploadedFiles()
    files: { poster?: Express.Multer.File[]; banner?: Express.Multer.File[] },
  ) {
    const anime = await this.animeService.update(
      id,
      updateAnimeDto,
      files.poster?.[0],
      files.banner?.[0],
    );
    return new AnimeResponseDto(anime);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить аниме по ID' })
  @ApiResponse({ status: 204, description: 'Аниме успешно удалено.' })
  @ApiResponse({ status: 404, description: 'Аниме не найдено.' })
  remove(@Param('id') id: string) {
    return this.animeService.remove(id);
  }
}
