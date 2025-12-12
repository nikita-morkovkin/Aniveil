import { ApiProperty } from '@nestjs/swagger';
import { Comment, User } from '@prisma/client';

export class CommentUserDto {
  @ApiProperty({
    description: 'ID пользователя',
    example: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
  })
  id: string;

  @ApiProperty({ description: 'Имя пользователя', example: 'testuser' })
  username: string;

  @ApiProperty({
    description: 'URL аватара пользователя',
    example: 'https://s3.amazonaws.com/bucket/avatar.jpg',
    required: false,
    nullable: true,
  })
  avatarUrl: string | null;
}

export class CommentResponseDto {
  @ApiProperty({
    description: 'Уникальный ID комментария',
    example: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
  })
  id: string;

  @ApiProperty({
    description: 'ID пользователя, оставившего комментарий',
    example: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
  })
  userId: string;

  @ApiProperty({
    description: 'ID аниме, к которому относится комментарий',
    example: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
  })
  animeId: string;

  @ApiProperty({
    description: 'Содержание комментария',
    example: 'Это очень хорошее аниме!',
  })
  content: string;

  @ApiProperty({
    description: 'Признак мягкого удаления комментария',
    example: false,
  })
  isDeleted: boolean;

  @ApiProperty({
    description: 'Дата создания записи',
    example: '2023-01-01T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Дата последнего обновления записи',
    example: '2023-01-01T13:00:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    type: CommentUserDto,
    description: 'Информация о пользователе, оставившем комментарий',
  })
  user: CommentUserDto;

  constructor(
    comment: Comment & { user: Pick<User, 'id' | 'username' | 'avatarUrl'> },
  ) {
    this.id = comment.id;
    this.userId = comment.userId;
    this.animeId = comment.animeId;
    this.content = comment.content;
    this.isDeleted = comment.isDeleted;
    this.createdAt = comment.createdAt;
    this.updatedAt = comment.updatedAt;
    this.user = comment.user;
  }
}
