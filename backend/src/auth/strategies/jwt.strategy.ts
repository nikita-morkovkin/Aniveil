import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

type JwtPayload = {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
};

/**
 * JWT Strategy для проверки Access токена
 *
 * Как это работает:
 * 1. Клиент отправляет запрос с заголовком: Authorization: Bearer <accessToken>
 * 2. Passport автоматически извлекает токен из заголовка
 * 3. Проверяет подпись токена с помощью SECRET
 * 4. Если токен валиден - вызывается метод validate()
 * 5. Результат validate() добавляется в request.user
 *
 * После этого в контроллерах можно использовать:
 * @UseGuards(JwtAuthGuard) - для защиты роута
 * @CurrentUser() user - для получения данных пользователя
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_ACCESS_SECRET');

    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * Метод validate() вызывается автоматически после успешной проверки токена
   *
   * payload - это данные, которые мы закодировали в токен:
   * { sub: userId, email: string, role: string }
   *
   * Здесь мы можем:
   * 1. Проверить, существует ли пользователь в БД
   * 2. Проверить, не заблокирован ли он
   * 3. Добавить дополнительные данные
   */
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    };
  }
}
