import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MAX_FILE_SIZE_KEY } from '../decorators/file-validation.decorator';
import { FileSizeExceededException } from '../s3.exceptions';

interface RequestWithFile {
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>;
}

@Injectable()
export class FileSizeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const maxSize = this.reflector.get<number>(
      MAX_FILE_SIZE_KEY,
      context.getHandler(),
    );

    if (!maxSize) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithFile>();
    const files = this.extractFiles(request);

    if (files.length === 0) {
      return true;
    }

    for (const file of files) {
      if (file.size > maxSize) {
        throw new FileSizeExceededException(file.size, maxSize);
      }
    }

    return true;
  }

  private extractFiles(request: RequestWithFile): Express.Multer.File[] {
    if (request.file) {
      return [request.file];
    }

    if (Array.isArray(request.files)) {
      return request.files;
    }

    if (request.files && typeof request.files === 'object') {
      return Object.values(request.files).flat();
    }

    return [];
  }
}
