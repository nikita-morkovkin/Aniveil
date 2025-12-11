import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';

/**
 * Google OAuth Strategy
 *
 * Как работает OAuth через Google:
 *
 * 1. Пользователь нажимает "Войти через Google" на фронтенде
 * 2. Фронтенд перенаправляет на /auth/google
 * 3. Google OAuth показывает пользователю окно согласия
 * 4. После согласия Google перенаправляет на /auth/google/callback
 * 5. Вызывается метод validate() с данными пользователя от Google
 * 6. Мы создаем/находим пользователя и генерируем JWT токены
 *
 * Настройка в Google Cloud Console:
 * 1. Создать проект
 * 2. Включить Google+ API
 * 3. Создать OAuth 2.0 Client ID
 * 4. Добавить Authorized redirect URIs:
 *    - http://localhost:3000/auth/google/callback (для разработки)
 *    - https://yourdomain.com/auth/google/callback (для продакшена)
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    if (!clientID || !clientSecret || !callbackURL) {
      throw new Error('Google OAuth environment variables are not configured');
    }

    super({
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  /**
   * Метод validate() вызывается после успешной авторизации через Google
   *
   * Параметры от Google:
   * - accessToken: токен для доступа к Google API (если нужно)
   * - refreshToken: для обновления accessToken (если запрошен offline access)
   * - profile: информация о пользователе
   *
   * Что есть в profile:
   * - id: уникальный Google ID пользователя
   * - emails: массив email адресов
   * - name: объект с именем и фамилией
   * - photos: массив с фото профиля
   */
  validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const { id, emails, displayName, photos } = profile;
    const primaryEmail = emails?.[0]?.value;

    if (!primaryEmail) {
      return done(new Error('Google profile does not contain an email'));
    }

    const user = {
      googleId: id,
      email: primaryEmail,
      username: displayName || primaryEmail.split('@')[0],
      avatarUrl: photos?.[0]?.value ?? null,
    };

    done(null, user);
  }
}
