import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserAdminResponseDto } from './dto/user-admin-response.dto';
import { UserFilterDto } from './dto/user-filter.dto';

@Injectable()
export class UserAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllUsers(filters: UserFilterDto): Promise<{
    data: UserAdminResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 50 } = filters;
    const skip = (page - 1) * limit;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: plainToInstance(UserAdminResponseDto, users, {
        excludeExtraneousValues: true,
      }),
      total,
      page,
      limit,
    };
  }

  async findUserById(id: string): Promise<UserAdminResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }
    return plainToInstance(UserAdminResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async updateUserRole(dto: UpdateUserRoleDto): Promise<UserAdminResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: dto.userId },
      data: { role: dto.role },
    });

    return plainToInstance(UserAdminResponseDto, updatedUser, {
      excludeExtraneousValues: true,
    });
  }

  async deleteUser(
    id: string,
    currentUserId: string,
  ): Promise<{ message: string }> {
    if (id === currentUserId) {
      throw new ForbiddenException('Нельзя удалить свой собственный аккаунт');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'Пользователь успешно удален' };
  }
}
