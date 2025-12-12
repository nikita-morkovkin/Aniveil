import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AnimeModule } from './anime/anime.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { CommentModule } from './comment/comment.module';
import { EpisodeModule } from './episode/episode.module';
import { FavoriteModule } from './favorite/favorite.module';
import { PrismaModule } from './prisma/prisma.module';
import { S3Module } from './s3/s3.module';
import { VideoQualityModule } from './video-quality/video-quality.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    S3Module,
    AnimeModule,
    EpisodeModule,
    VideoQualityModule,
    CommentModule,
    FavoriteModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 1) Сначала проверяем JWT (и уважаем @Public())
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // 2) Потом проверяем роли там, где есть @Roles()
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
