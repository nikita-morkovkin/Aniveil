import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { S3Module } from '../s3/s3.module';
import {
  VideoQualityByIdController,
  VideoQualityController,
} from './video-quality.controller';
import { VideoQualityService } from './video-quality.service';

@Module({
  imports: [PrismaModule, S3Module],
  providers: [VideoQualityService],
  controllers: [VideoQualityController, VideoQualityByIdController],
  exports: [VideoQualityService],
})
export class VideoQualityModule {}
