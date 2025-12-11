import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

/**
 * JWT Guard для защиты роутов
 *
 * Использование в контроллере:
 * @UseGuards(JwtAuthGuard)
 * @Get('protected')
 * getProtectedData(@CurrentUser() user: any) {
 *   return user;
 * }
 *
 * Этот Guard:
 * 1. Проверяет наличие токена в заголовке Authorization
 * 2. Проверяет подпись и срок действия токена
 * 3. Извлекает данные пользователя из токена
 * 4. Добавляет пользователя в request.user
 *
 * Если токен невалиден - выбрасывает UnauthorizedException (401)
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    _info: any,
    _context: ExecutionContext,
    _status?: any,
  ): TUser {
    void _info;
    void _context;
    void _status;

    if (err || !user) {
      throw err || new UnauthorizedException('Требуется авторизация');
    }
    return user;
  }
}
