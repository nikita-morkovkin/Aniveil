import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UserAdminResponseDto } from './dto/user-admin-response.dto';
import { UserAdminService } from './user-admin.service';

@ApiTags('Admin/Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/users')
export class UserAdminController {
  constructor(private readonly userAdminService: UserAdminService) {}

  @Get()
  @ApiOperation({
    summary: 'Получить список всех пользователей (только для админов)',
  })
  @ApiResponse({
    status: 200,
    description: 'Список пользователей',
    type: [UserAdminResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Неавторизованный доступ' })
  @ApiResponse({ status: 403, description: 'Доступ запрещен' })
  async findAllUsers(): Promise<UserAdminResponseDto[]> {
    return this.userAdminService.findAllUsers();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить пользователя по ID (только для админов)' })
  @ApiResponse({
    status: 200,
    description: 'Данные пользователя',
    type: UserAdminResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiResponse({ status: 401, description: 'Неавторизованный доступ' })
  @ApiResponse({ status: 403, description: 'Доступ запрещен' })
  async findUserById(
    @Param('id')
    id: string,
  ): Promise<UserAdminResponseDto> {
    return this.userAdminService.findUserById(id);
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновить роль пользователя (только для админов)' })
  @ApiResponse({
    status: 200,
    description: 'Роль пользователя обновлена',
    type: UserAdminResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiResponse({ status: 401, description: 'Неавторизованный доступ' })
  @ApiResponse({ status: 403, description: 'Доступ запрещен' })
  async updateUserRole(
    @Param('id') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<UserAdminResponseDto> {
    return this.userAdminService.updateUserRole({ ...dto, userId });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Удалить пользователя (только для админов)' })
  @ApiResponse({ status: 200, description: 'Пользователь успешно удален' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiResponse({ status: 401, description: 'Неавторизованный доступ' })
  @ApiResponse({ status: 403, description: 'Доступ запрещен' })
  async deleteUser(@Param('id') id: string): Promise<{ message: string }> {
    return this.userAdminService.deleteUser(id);
  }
}
