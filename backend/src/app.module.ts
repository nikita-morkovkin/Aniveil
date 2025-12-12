import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnimeModule } from './anime/anime.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CommentModule } from './comment/comment.module';
import { EpisodeModule } from './episode/episode.module';
import { FavoriteModule } from './favorite/favorite.module';
import { PrismaModule } from './prisma/prisma.module';
import { S3Module } from './s3/s3.module';
import { UserAdminModule } from './user-admin/user-admin.module';
import { VideoProcessorModule } from './video-processor/video-processor.module';
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
    VideoProcessorModule,
    CommentModule,
    FavoriteModule,
    UserAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
