import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOWED_FILE_TYPES_KEY } from '../decorators/file-validation.decorator';
import { InvalidFileTypeException } from '../s3.exceptions';

interface RequestWithFile {
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | Record<string, Express.Multer.File[]>;
}

@Injectable()
export class FileTypeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowedTypes = this.reflector.get<string[]>(
      ALLOWED_FILE_TYPES_KEY,
      context.getHandler(),
    );

    if (!allowedTypes || allowedTypes.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithFile>();
    const files = this.extractFiles(request);

    if (files.length === 0) {
      return true;
    }

    for (const file of files) {
      if (!allowedTypes.includes(file.mimetype)) {
        throw new InvalidFileTypeException(file.mimetype, allowedTypes);
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
