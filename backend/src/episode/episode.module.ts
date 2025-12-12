import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EpisodeByIdController, EpisodeController } from './episode.controller';
import { EpisodeService } from './episode.service';

@Module({
  imports: [PrismaModule],
  providers: [EpisodeService],
  controllers: [EpisodeController, EpisodeByIdController],
})
export class EpisodeModule {}
