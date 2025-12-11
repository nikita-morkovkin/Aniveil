import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * Guard для проверки ролей пользователя
 *
 * Используется совместно с декоратором @Roles()
 *
 * ВАЖНО: RolesGuard должен использоваться ПОСЛЕ JwtAuthGuard,
 * так как он требует наличия user в request
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    if (!requiredRoles) {
      return true;
    }

    const role = context
      .switchToHttp()
      .getRequest<{ user?: { role?: string } }>().user?.role;

    if (!role) {
      throw new ForbiddenException(
        'Недостаточно прав для выполнения этого действия',
      );
    }

    const hasRole = requiredRoles.includes(role);

    if (!hasRole) {
      throw new ForbiddenException(
        'Недостаточно прав для выполнения этого действия',
      );
    }

    return true;
  }
}
