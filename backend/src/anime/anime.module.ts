import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { AnimeController } from './anime.controller';
import { AnimeService } from './anime.service';

@Module({
  imports: [PrismaModule, S3Module],
  providers: [AnimeService],
  controllers: [AnimeController],
})
export class AnimeModule {}
