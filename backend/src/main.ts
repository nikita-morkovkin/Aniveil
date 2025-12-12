import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import {
  PrismaClientExceptionFilter,
  PrismaClientInitializationExceptionFilter,
  PrismaClientValidationExceptionFilter,
} from './prisma/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Настройка CORS для работы с фронтендом
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Безопасность с помощью Helmet
  app.use(helmet());

  // Cookie Parser для работы с cookies (если понадобится)
  app.use(cookieParser());

  // Глобальный префикс для всех роутов (опционально)
  app.setGlobalPrefix('api');

  // Глобальная валидация с помощью class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Удаляет свойства, которых нет в DTO
      forbidNonWhitelisted: true, // Выбрасывает ошибку при лишних полях
      transform: true, // Автоматически трансформирует типы (например, string -> number)
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Глобальные фильтры исключений для Prisma
  app.useGlobalFilters(
    new PrismaClientExceptionFilter(),
    new PrismaClientInitializationExceptionFilter(),
    new PrismaClientValidationExceptionFilter(),
  );

  // Настройка Swagger документации
  const config = new DocumentBuilder()
    .setTitle('Aniveil API')
    .setDescription(
      'API документация для Aniveil - платформы для просмотра аниме для взрослых',
    )
    .setVersion('1.0')
    .addBearerAuth() // Добавляет возможность авторизации в Swagger UI
    .addTag('Authentication', 'Эндпоинты для аутентификации и авторизации')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Сервер запущен на http://localhost:${port}`);
  console.log(`📚 Swagger документация: http://localhost:${port}/api/docs`);
}

void bootstrap();
