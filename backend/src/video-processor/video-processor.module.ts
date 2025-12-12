import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import { VideoQualityModule } from '../video-quality/video-quality.module';
import { VideoProcessorController } from './video-processor.controller';
import { VideoProcessorService } from './video-processor.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    S3Module,
    VideoQualityModule,
  ],
  controllers: [VideoProcessorController],
  providers: [VideoProcessorService],
  exports: [VideoProcessorService],
})
export class VideoProcessorModule {}
