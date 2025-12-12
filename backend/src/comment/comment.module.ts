import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommentByIdController, CommentController } from './comment.controller';
import { CommentService } from './comment.service';

@Module({
  imports: [PrismaModule],
  providers: [CommentService],
  controllers: [CommentController, CommentByIdController],
})
export class CommentModule {}
