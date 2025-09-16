import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Simple rate limiting guard to prevent abuse
 * Tracks requests by IP address
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly requests = new Map<string, number[]>();
  private readonly maxRequests = 100; // Max requests per window
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIp = this.getClientIp(request);

    // Clean old requests outside the window
    this.cleanOldRequests(clientIp);

    // Get current request count for this IP
    const requestTimes = this.requests.get(clientIp) || [];

    // Check if limit exceeded
    if (requestTimes.length >= this.maxRequests) {
      this.logger.warn(`Rate limit exceeded for IP: ${clientIp}`);
      throw new HttpException(
        {
          message: 'Too many requests, please try again later',
          type: 'RATE_LIMIT_EXCEEDED',
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Add current request time
    requestTimes.push(Date.now());
    this.requests.set(clientIp, requestTimes);

    return true;
  }

  /**
   * Extract client IP address from request
   */
  private getClientIp(request: Request): string {
    return (
      request.headers['x-forwarded-for'] as string ||
      request.headers['x-real-ip'] as string ||
      request.connection.remoteAddress ||
      request.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Remove old requests outside the time window
   */
  private cleanOldRequests(clientIp: string): void {
    const now = Date.now();
    const requestTimes = this.requests.get(clientIp) || [];
    const validRequests = requestTimes.filter(
      (time) => now - time < this.windowMs,
    );

    if (validRequests.length === 0) {
      this.requests.delete(clientIp);
    } else {
      this.requests.set(clientIp, validRequests);
    }
  }
}