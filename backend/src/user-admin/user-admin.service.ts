import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserAdminResponseDto } from './dto/user-admin-response.dto';

@Injectable()
export class UserAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllUsers(): Promise<UserAdminResponseDto[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return plainToInstance(UserAdminResponseDto, users, {
      excludeExtraneousValues: true,
    });
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

  async deleteUser(id: string): Promise<{ message: string }> {
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
