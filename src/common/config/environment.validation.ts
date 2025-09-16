import { Logger } from '@nestjs/common';

/**
 * Environment configuration validation
 * Ensures all required environment variables are set with secure defaults
 */
export class EnvironmentValidator {
  private static readonly logger = new Logger(EnvironmentValidator.name);

  /**
   * Validate and set secure environment defaults
   * Called during application bootstrap
   */
  static validateEnvironment(): void {
    this.logger.log('Validating environment configuration...');

    // Set NODE_ENV default
    if (!process.env.NODE_ENV) {
      process.env.NODE_ENV = 'development';
      this.logger.warn('NODE_ENV not set, defaulting to development');
    }

    // Validate production environment
    if (process.env.NODE_ENV === 'production') {
      this.validateProductionEnvironment();
    }

    // Set secure defaults
    this.setSecureDefaults();

    this.logger.log(`Environment validation complete - Mode: ${process.env.NODE_ENV}`);
  }

  /**
   * Validate required production environment variables
   */
  private static validateProductionEnvironment(): void {
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY',
      'FRONTEND_URL',
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      this.logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
      throw new Error(`Production environment validation failed. Missing: ${missingVars.join(', ')}`);
    }

    // Validate URLs
    if (process.env.SUPABASE_URL && !this.isValidUrl(process.env.SUPABASE_URL)) {
      throw new Error('SUPABASE_URL must be a valid URL');
    }

    // Validate frontend URLs
    if (process.env.FRONTEND_URL) {
      const frontendUrls = process.env.FRONTEND_URL.split(',');
      for (const url of frontendUrls) {
        if (!this.isValidUrl(url.trim())) {
          throw new Error(`Invalid frontend URL: ${url}`);
        }
      }
    }
  }

  /**
   * Set secure defaults for optional environment variables
   */
  private static setSecureDefaults(): void {
    // Security headers
    if (!process.env.RATE_LIMIT_MAX) {
      process.env.RATE_LIMIT_MAX = '100';
    }

    if (!process.env.RATE_LIMIT_WINDOW_MS) {
      process.env.RATE_LIMIT_WINDOW_MS = '900000'; // 15 minutes
    }

    // Logging level
    if (!process.env.LOG_LEVEL) {
      process.env.LOG_LEVEL = process.env.NODE_ENV === 'production' ? 'warn' : 'debug';
    }

    // Port configuration
    if (!process.env.PORT) {
      process.env.PORT = '8080';
    }
  }

  /**
   * Validate if a string is a valid URL
   */
  private static isValidUrl(string: string): boolean {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get environment configuration summary for logging
   */
  static getConfigSummary(): Record<string, any> {
    return {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      logLevel: process.env.LOG_LEVEL,
      rateLimit: {
        max: process.env.RATE_LIMIT_MAX,
        windowMs: process.env.RATE_LIMIT_WINDOW_MS,
      },
      hasSupabaseUrl: !!process.env.SUPABASE_URL,
      hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
      frontendUrls: process.env.FRONTEND_URL?.split(',').length || 0,
    };
  }
}