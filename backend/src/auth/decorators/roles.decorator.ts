import { SetMetadata } from '@nestjs/common';

/**
 * Декоратор для указания требуемых ролей для доступа к роуту
 *
 * Использование:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('ADMIN')
 * @Delete(':id')
 * deleteUser(@Param('id') id: string) {
 *   // Только ADMIN может удалить пользователя
 * }
 *
 * Можно указать несколько ролей (достаточно одной):
 * @Roles('ADMIN', 'MODERATOR')
 * @Get('reports')
 * getReports() {
 *   // Доступно для ADMIN и MODERATOR
 * }
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
