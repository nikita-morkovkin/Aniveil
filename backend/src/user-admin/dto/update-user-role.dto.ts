import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserRoleDto {
  @ApiProperty({
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    description: 'Идентификатор пользователя',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: Role.ADMIN, description: 'Новая роль пользователя' })
  @IsEnum(Role)
  role: Role;
}
