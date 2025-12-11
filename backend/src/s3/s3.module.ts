import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileSizeGuard, FileTypeGuard } from './guards';
import { S3AdminController } from './s3-admin.controller';
import { S3CoreService } from './s3-core.service';
import { S3PublicController } from './s3-public.controller';
import { S3Service } from './s3.service';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [S3PublicController, S3AdminController],
  providers: [S3Service, S3CoreService, FileTypeGuard, FileSizeGuard],
  exports: [S3Service, S3CoreService],
})
export class S3Module {}
