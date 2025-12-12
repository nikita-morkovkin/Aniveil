import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { Role } from '@prisma/client';

export class UserAdminResponseDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'Идентификатор пользователя',
  })
  @Expose()
  id: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email пользователя',
  })
  @Expose()
  email: string;

  @ApiProperty({ example: 'username', description: 'Имя пользователя' })
  @Expose()
  username: string;

  @ApiProperty({ example: Role.USER, description: 'Роль пользователя' })
  @Expose()
  role: Role;

  @ApiProperty({
    example: 'https://example.com/avatar.jpg',
    description: 'URL аватара пользователя',
    nullable: true,
  })
  @Expose()
  avatarUrl: string | null;

  @ApiProperty({
    example: '2023-01-01T12:00:00.000Z',
    description: 'Дата создания пользователя',
  })
  @Expose()
  createdAt: Date;

  @ApiProperty({
    example: '2023-01-01T12:00:00.000Z',
    description: 'Дата последнего обновления пользователя',
  })
  @Expose()
  updatedAt: Date;
}
