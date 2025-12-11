import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Google OAuth Guard
 *
 * Используется для инициации процесса OAuth авторизации через Google
 *
 * Применение:
 * @Get('google')
 * @UseGuards(GoogleAuthGuard)
 * googleAuth() {
 *   // Перенаправит пользователя на страницу авторизации Google
 * }
 *
 * После успешной авторизации Google перенаправит на callback URL
 *
 * ВАЖНО: Мы используем JWT (stateless) без сессий,
 * поэтому НЕ вызываем super.logIn() - он требует express-session.
 * Данные пользователя от Google передаются через request.user,
 * который заполняется методом validate() в GoogleStrategy.
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const activate = (await super.canActivate(context)) as boolean;

    return activate;
  }
}
