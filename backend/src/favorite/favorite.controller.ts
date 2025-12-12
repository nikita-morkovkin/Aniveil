import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FavoriteResponseDto } from './dto/favorite-response.dto';
import { FavoriteService } from './favorite.service';

@ApiTags('Favorites')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('favorites')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  @Post(':animeId')
  @Roles(Role.USER, Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Добавить аниме в избранное' })
  @ApiResponse({
    status: 201,
    description: 'Аниме успешно добавлено в избранное.',
    type: FavoriteResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Неверный запрос.' })
  async add(@CurrentUser() user: User, @Param('animeId') animeId: string) {
    const favorite = await this.favoriteService.add(user.id, animeId);
    return new FavoriteResponseDto(favorite);
  }

  @Get()
  @Roles(Role.USER, Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить список избранного текущего пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Список избранного успешно получен.',
    type: [FavoriteResponseDto],
  })
  async findAll(@CurrentUser() user: User) {
    const favorites = await this.favoriteService.findAll(user.id);
    return favorites.map((favorite) => new FavoriteResponseDto(favorite));
  }

  @Delete(':animeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.USER, Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить аниме из избранного' })
  @ApiResponse({
    status: 204,
    description: 'Аниме успешно удалено из избранного.',
  })
  @ApiResponse({ status: 404, description: 'Аниме не найдено в избранном.' })
  remove(@CurrentUser() user: User, @Param('animeId') animeId: string) {
    return this.favoriteService.remove(user.id, animeId);
  }
}
