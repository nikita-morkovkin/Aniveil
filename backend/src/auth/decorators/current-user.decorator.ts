import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Декоратор для получения текущего авторизованного пользователя
 *
 * Использование:
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@CurrentUser() user: any) {
 *   console.log(user.id);
 *   console.log(user.email);
 *   console.log(user.role);
 *   return user;
 * }
 *
 * Можно извлечь конкретное поле:
 * @Get('email')
 * getEmail(@CurrentUser('email') email: string) {
 *   return { email };
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // Если указан конкретный ключ (например, 'email'), возвращаем его
    return data ? user?.[data] : user;
  },
);
