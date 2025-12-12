import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

type UserPayload = {
  id: string;
  email: string;
  username: string;
  role: string;
};

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
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as UserPayload;

    // Если указан конкретный ключ (например, 'email'), возвращаем его
    return data ? user?.[data as keyof UserPayload] : user;
  },
);
