import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CommentFilterDto } from './dto/comment-filter.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Injectable()
export class CommentService {
  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    animeId: string,
    createCommentDto: CreateCommentDto,
  ) {
    const existingAnime = await this.prisma.anime.findUnique({
      where: { id: animeId },
    });

    if (!existingAnime) {
      throw new NotFoundException(`Аниме с ID '${animeId}' не найдено.`);
    }

    const comment = await this.prisma.comment.create({
      data: {
        ...createCommentDto,
        userId,
        animeId,
      },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
    return comment;
  }

  async findAll(animeId: string, filters: CommentFilterDto) {
    const { page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const existingAnime = await this.prisma.anime.findUnique({
      where: { id: animeId },
    });

    if (!existingAnime) {
      throw new NotFoundException(`Аниме с ID '${animeId}' не найдено.`);
    }

    const where: Prisma.CommentWhereInput = {
      animeId,
      isDeleted: false,
    };

    const [comments, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
        },
      }),
      this.prisma.comment.count({ where }),
    ]);

    return { data: comments, total, page, limit };
  }

  async findOne(id: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id, isDeleted: false },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });

    if (!comment) {
      throw new NotFoundException(`Комментарий с ID '${id}' не найден.`);
    }
    return comment;
  }

  async update(
    id: string,
    userId: string,
    userRole: Role,
    updateCommentDto: UpdateCommentDto,
  ) {
    const existingComment = await this.prisma.comment.findUnique({
      where: { id, isDeleted: false },
    });

    if (!existingComment) {
      throw new NotFoundException(`Комментарий с ID '${id}' не найден.`);
    }

    if (
      existingComment.userId !== userId &&
      userRole !== Role.ADMIN &&
      userRole !== Role.MODERATOR
    ) {
      throw new ForbiddenException(
        'У вас нет прав для обновления этого комментария.',
      );
    }

    const comment = await this.prisma.comment.update({
      where: { id },
      data: updateCommentDto,
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
    return comment;
  }

  async remove(id: string, userId: string, userRole: Role) {
    const existingComment = await this.prisma.comment.findUnique({
      where: { id, isDeleted: false },
    });

    if (!existingComment) {
      throw new NotFoundException(`Комментарий с ID '${id}' не найден.`);
    }

    if (
      existingComment.userId !== userId &&
      userRole !== Role.ADMIN &&
      userRole !== Role.MODERATOR
    ) {
      throw new ForbiddenException(
        'У вас нет прав для удаления этого комментария.',
      );
    }

    // Мягкое удаление
    await this.prisma.comment.update({
      where: { id },
      data: { isDeleted: true },
    });
  }
}
