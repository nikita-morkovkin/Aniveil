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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { Role } from '@prisma/client';
import { CurrentUser, Public, Roles } from '../auth/decorators';
import { CommentService } from './comment.service';
import { CommentFilterDto } from './dto/comment-filter.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@ApiTags('Comments - By Anime')
@Controller('anime')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post(':animeId/comments')
  @Roles(Role.USER, Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Добавить комментарий к аниме' })
  @ApiResponse({
    status: 201,
    description: 'Комментарий успешно добавлен.',
    type: CommentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Неверный запрос.' })
  async create(
    @CurrentUser() user: User,
    @Param('animeId') animeId: string,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    const comment = await this.commentService.create(
      user.id,
      animeId,
      createCommentDto,
    );
    return new CommentResponseDto(comment);
  }

  @Public()
  @Get(':animeId/comments')
  @ApiOperation({ summary: 'Получить список комментариев для аниме' })
  @ApiResponse({
    status: 200,
    description: 'Список комментариев успешно получен.',
    type: [CommentResponseDto],
  })
  async findAll(
    @Param('animeId') animeId: string,
    @Query() filters: CommentFilterDto,
  ) {
    const { data, total, page, limit } = await this.commentService.findAll(
      animeId,
      filters,
    );
    return {
      data: data.map((comment) => new CommentResponseDto(comment)),
      total,
      page,
      limit,
    };
  }
}

@ApiTags('Comments - By ID')
@Controller('comments')
export class CommentByIdController {
  constructor(private readonly commentService: CommentService) {}

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Получить детали комментария по ID' })
  @ApiResponse({
    status: 200,
    description: 'Детали комментария успешно получены.',
    type: CommentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Комментарий не найден.' })
  async findOne(@Param('id') id: string) {
    const comment = await this.commentService.findOne(id);
    return new CommentResponseDto(comment);
  }

  @Patch(':id')
  @Roles(Role.USER, Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Обновить комментарий по ID' })
  @ApiResponse({
    status: 200,
    description: 'Комментарий успешно обновлен.',
    type: CommentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Комментарий не найден.' })
  async update(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    const comment = await this.commentService.update(
      id,
      user.id,
      user.role,
      updateCommentDto,
    );
    return new CommentResponseDto(comment);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role.USER, Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Удалить комментарий по ID' })
  @ApiResponse({ status: 204, description: 'Комментарий успешно удален.' })
  @ApiResponse({ status: 404, description: 'Комментарий не найден.' })
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.commentService.remove(id, user.id, user.role);
  }
}
