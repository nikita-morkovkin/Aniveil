import {
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import {
  LoginDto,
  RegisterDto,
  TokenResponseDto,
  UserResponseDto,
} from './dto';

@Injectable()
export class AuthService implements OnModuleDestroy {
  // Временное хранилище кодов авторизации (в продакшене лучше Redis)
  private readonly authCodes = new Map<
    string,
    { tokens: TokenResponseDto; expiresAt: number }
  >();
  private readonly AUTH_CODE_TTL = 30000; // 30 секунд
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Очистка истекших кодов каждые 30 секунд
    this.cleanupInterval = setInterval(() => this.cleanupAuthCodes(), 30000);
  }

  onModuleDestroy() {
    clearInterval(this.cleanupInterval);
  }

  /**
   * Сохранение токенов под временным кодом (для безопасного OAuth callback)
   */
  async storeAuthCode(tokens: TokenResponseDto): Promise<string> {
    const code = crypto.randomUUID();
    this.authCodes.set(code, {
      tokens,
      expiresAt: Date.now() + this.AUTH_CODE_TTL,
    });
    return code;
  }

  /**
   * Обмен временного кода на токены
   */
  async exchangeAuthCode(code: string): Promise<TokenResponseDto> {
    const stored = this.authCodes.get(code);

    if (!stored) {
      throw new UnauthorizedException(
        'Невалидный или истекший код авторизации',
      );
    }

    if (Date.now() > stored.expiresAt) {
      this.authCodes.delete(code);
      throw new UnauthorizedException('Код авторизации истек');
    }

    // Удаляем код после использования (одноразовый)
    this.authCodes.delete(code);

    return stored.tokens;
  }

  private cleanupAuthCodes(): void {
    const now = Date.now();
    for (const [code, data] of this.authCodes.entries()) {
      if (now > data.expiresAt) {
        this.authCodes.delete(code);
      }
    }
  }

  async register(dto: RegisterDto): Promise<TokenResponseDto> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const hashedPassword = await this.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        username: dto.username,
      },
    });

    return this.generateTokens(user.id, user.email, user.role);
  }

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    return this.generateTokens(user.id, user.email, user.role);
  }

  async googleAuth(
    googleId: string,
    email: string,
    username: string,
    avatarUrl?: string | null,
  ): Promise<TokenResponseDto> {
    let user = await this.prisma.user.findUnique({
      where: { googleId },
    });

    if (!user) {
      const existingUserByEmail = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUserByEmail) {
        throw new ConflictException(
          'Пользователь с таким email уже существует. Войдите через email/пароль.',
        );
      }

      user = await this.prisma.user.create({
        data: {
          email,
          username,
          googleId,
          password: null, // Для Google OAuth пароль не нужен
          avatarUrl: avatarUrl ?? null,
        },
      });
    }

    return this.generateTokens(user.id, user.email, user.role);
  }

  async refreshTokens(refreshToken: string): Promise<TokenResponseDto> {
    try {
      this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const storedToken = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!storedToken) {
        throw new UnauthorizedException('Невалидный refresh токен');
      }

      if (new Date() > storedToken.expiresAt) {
        await this.prisma.refreshToken.delete({
          where: { id: storedToken.id },
        });
        throw new UnauthorizedException('Refresh токен истек');
      }

      await this.prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });

      return this.generateTokens(
        storedToken.user.id,
        storedToken.user.email,
        storedToken.user.role,
      );
    } catch (error) {
      throw new UnauthorizedException('Невалидный refresh токен', {
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        token: refreshToken,
      },
    });
  }

  async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Хеширование пароля с помощью bcrypt
   * Используем 10 раундов соли - хороший баланс между безопасностью и производительностью
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Генерация пары токенов (access + refresh)
   *
   * Access Token:
   * - Живет 15 минут
   * - Используется для авторизации запросов к API
   * - Передается в заголовке Authorization: Bearer <token>
   *
   * Refresh Token:
   * - Живет 7 дней
   * - Используется для обновления access токена
   * - Хранится в БД для возможности отзыва
   */
  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<TokenResponseDto> {
    const payload = {
      sub: userId,
      email,
      role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m', // 15 минут
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d', // 7 дней
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // +7 дней

    // Ограничиваем количество активных refresh токенов (макс 5 на пользователя)
    const MAX_REFRESH_TOKENS = 5;
    const existingTokens = await this.prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (existingTokens.length >= MAX_REFRESH_TOKENS) {
      // Удаляем старые токены, оставляя место для нового
      const tokensToDelete = existingTokens.slice(
        0,
        existingTokens.length - MAX_REFRESH_TOKENS + 1,
      );
      await this.prisma.refreshToken.deleteMany({
        where: { id: { in: tokensToDelete.map((t) => t.id) } },
      });
    }

    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
