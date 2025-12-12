import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

type PrismaMetaRecord = Record<string, unknown>;

const isMetaRecord = (
  meta: Prisma.PrismaClientKnownRequestError['meta'],
): meta is PrismaMetaRecord =>
  Boolean(meta) && typeof meta === 'object' && !Array.isArray(meta);

const getMetaValue = <T>(
  meta: Prisma.PrismaClientKnownRequestError['meta'],
  key: string,
): T | undefined => {
  if (!isMetaRecord(meta)) {
    return undefined;
  }

  return meta[key] as T | undefined;
};

/**
 * Глобальный фильтр для обработки ошибок Prisma
 *
 * Преобразует известные ошибки Prisma в понятные HTTP ответы
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Внутренняя ошибка сервера';
    let details: Record<string, unknown> | undefined;

    switch (exception.code) {
      // Unique constraint violation
      case 'P2002': {
        status = HttpStatus.CONFLICT;
        const target = getMetaValue<string[]>(exception.meta, 'target') || [];
        message = `Запись с такими данными уже существует`;
        details = {
          fields: target,
          constraint: 'unique',
        };
        break;
      }

      // Foreign key constraint violation
      case 'P2003': {
        status = HttpStatus.BAD_REQUEST;
        message = 'Связанная запись не найдена';
        details = {
          field: getMetaValue<string>(exception.meta, 'field_name'),
          constraint: 'foreign_key',
        };
        break;
      }

      // Record not found
      case 'P2025': {
        status = HttpStatus.NOT_FOUND;
        message = 'Запись не найдена';
        details = {
          cause: getMetaValue<string>(exception.meta, 'cause'),
        };
        break;
      }

      // Value too long for column
      case 'P2000': {
        status = HttpStatus.BAD_REQUEST;
        message = 'Значение слишком длинное для поля';
        details = {
          column: getMetaValue<string>(exception.meta, 'column_name'),
          constraint: 'length',
        };
        break;
      }

      // Invalid value for column type
      case 'P2007': {
        status = HttpStatus.BAD_REQUEST;
        message = 'Неверный тип данных';
        details = {
          constraint: 'data_validation',
        };
        break;
      }

      // Required field missing
      case 'P2011': {
        status = HttpStatus.BAD_REQUEST;
        message = 'Обязательное поле не заполнено';
        details = {
          constraint: 'null_constraint',
        };
        break;
      }

      // Required relation violation (trying to delete parent with children)
      case 'P2014': {
        status = HttpStatus.BAD_REQUEST;
        message =
          'Невозможно удалить запись, так как с ней связаны другие записи';
        details = {
          relation: getMetaValue<string>(exception.meta, 'relation_name'),
          constraint: 'relation',
        };
        break;
      }

      // Dependent record not found
      case 'P2015': {
        status = HttpStatus.NOT_FOUND;
        message = 'Связанная запись не найдена';
        details = {
          constraint: 'relation',
        };
        break;
      }

      // Invalid input
      case 'P2020': {
        status = HttpStatus.BAD_REQUEST;
        message = 'Неверное значение для типа данных';
        break;
      }

      // Transaction failed
      case 'P2034': {
        status = HttpStatus.CONFLICT;
        message = 'Транзакция не может быть выполнена из-за конфликта записи';
        break;
      }

      default: {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = `Ошибка базы данных: ${exception.code}`;
        details = {
          code: exception.code,
          meta: exception.meta,
        };
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: 'Database Error',
      details,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Фильтр для общих ошибок Prisma (когда БД недоступна и т.д.)
 */
@Catch(Prisma.PrismaClientInitializationError)
export class PrismaClientInitializationExceptionFilter implements ExceptionFilter {
  catch(
    exception: Prisma.PrismaClientInitializationError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(HttpStatus.SERVICE_UNAVAILABLE).json({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'База данных временно недоступна',
      error: 'Database Connection Error',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Фильтр для ошибок валидации Prisma
 */
@Catch(Prisma.PrismaClientValidationError)
export class PrismaClientValidationExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientValidationError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const responseBody: Record<string, unknown> = {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Ошибка валидации данных',
      error: 'Validation Error',
      timestamp: new Date().toISOString(),
    };

    // Раскрываем детали только в development (безопасность)
    if (process.env.NODE_ENV === 'development') {
      responseBody.details = {
        message: exception.message,
      };
    }

    response.status(HttpStatus.BAD_REQUEST).json(responseBody);
  }
}
