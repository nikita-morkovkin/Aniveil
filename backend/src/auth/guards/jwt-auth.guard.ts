import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

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
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Swagger UI + assets: в dev удобнее держать публичным
    const req = context.switchToHttp().getRequest<Request>();
    const url = (req.originalUrl ?? req.url) || '';
    if (
      url.startsWith('/api/docs') ||
      url.startsWith('/api/docs-json') ||
      url.startsWith('/api/docs-yaml')
    ) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
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
