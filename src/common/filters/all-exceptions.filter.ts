import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global exception filter to handle all exceptions consistently
 * Provides proper error formatting and logging
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine status code and error message
    let status: number;
    let message: string;
    let errorCode: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();

      if (typeof errorResponse === 'string') {
        message = errorResponse;
        errorCode = 'HTTP_EXCEPTION';
      } else {
        message = (errorResponse as any).message || exception.message;
        errorCode = (errorResponse as any).type || 'HTTP_EXCEPTION';
      }
    } else {
      // Handle unexpected errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      errorCode = 'INTERNAL_ERROR';

      // Log the full error for debugging
      this.logger.error(
        `Unexpected error: ${(exception as Error).message}`,
        (exception as Error).stack,
      );
    }

    // Create standardized error response
    const errorResponse = {
      statusCode: status,
      message,
      errorCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
    };

    // Log error for monitoring
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
    );

    response.status(status).json(errorResponse);
  }
}