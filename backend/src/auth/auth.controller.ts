import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './decorators';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  TokenResponseDto,
  UserResponseDto,
} from './dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Регистрация нового пользователя' })
  @ApiResponse({
    status: 201,
    description: 'Пользователь успешно зарегистрирован',
    type: TokenResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Пользователь уже существует' })
  @ApiResponse({ status: 400, description: 'Невалидные данные' })
  async register(@Body() dto: RegisterDto): Promise<TokenResponseDto> {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход в систему' })
  @ApiResponse({
    status: 200,
    description: 'Успешный вход',
    type: TokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Неверный email или пароль' })
  async login(@Body() dto: LoginDto): Promise<TokenResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновление access токена' })
  @ApiResponse({
    status: 200,
    description: 'Токены обновлены',
    type: TokenResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Невалидный refresh токен' })
  async refresh(@Body() dto: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Выход из системы' })
  @ApiResponse({ status: 200, description: 'Успешный выход' })
  @ApiResponse({ status: 401, description: 'Требуется авторизация' })
  async logout(
    @CurrentUser('id') userId: string,
    @Body() dto: RefreshTokenDto,
  ): Promise<{ message: string }> {
    await this.authService.logout(userId, dto.refreshToken);
    return { message: 'Успешный выход из системы' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить данные текущего пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Данные пользователя',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Требуется авторизация' })
  async getCurrentUser(
    @CurrentUser('id') userId: string,
  ): Promise<UserResponseDto> {
    return this.authService.getCurrentUser(userId);
  }

  /**
   * OAuth через Google - Шаг 1: Инициация
   *
   * При переходе на этот эндпоинт пользователь будет перенаправлен
   * на страницу авторизации Google
   *
   * Пример использования (фронтенд):
   * <a href="http://localhost:3000/auth/google">Войти через Google</a>
   *
   * или
   *
   * window.location.href = 'http://localhost:3000/auth/google'
   */
  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Авторизация через Google' })
  @ApiResponse({ status: 302, description: 'Перенаправление на Google' })
  googleAuth() {
    // Этот метод сработает до перенаправления на Google
    // Но реальная логика в GoogleStrategy
  }

  /**
   * OAuth через Google - Шаг 2: Callback
   *
   * Google перенаправит пользователя сюда после успешной авторизации
   * Мы получаем данные пользователя, создаем/находим его в БД,
   * генерируем JWT токены и перенаправляем на фронтенд
   *
   * URL для настройки в Google Cloud Console:
   * http://localhost:3000/auth/google/callback (dev)
   * https://yourdomain.com/auth/google/callback (prod)
   */
  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Callback от Google после авторизации' })
  @ApiResponse({
    status: 302,
    description: 'Перенаправление на фронтенд с токенами',
  })
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const { googleId, email, username } = req.user as {
      googleId: string;
      email: string;
      username: string;
      avatarUrl?: string | null;
    };
    const tokens = await this.authService.googleAuth(googleId, email, username);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;

    res.redirect(redirectUrl);
  }
}
