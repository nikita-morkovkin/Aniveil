import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

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
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: { role?: Role } }>();

    if (!user || !user.role) {
      throw new ForbiddenException(
        'Недостаточно прав для выполнения этого действия',
      );
    }

    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Требуется одна из ролей: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
