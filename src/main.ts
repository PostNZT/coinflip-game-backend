import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { EnvironmentValidator } from './common/config/environment.validation';

/**
 * Bootstrap the NestJS application
 * Sets up security, validation, documentation, and middleware
 */
async function bootstrap() {
  // Validate environment configuration first
  EnvironmentValidator.validateEnvironment();

  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Global exception filter for consistent error handling
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global validation pipe with security settings
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Throw error for unknown properties
      disableErrorMessages: process.env.NODE_ENV === 'production', // Hide detailed validation errors in production
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration with security considerations
  app.enableCors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL?.split(',') || false
      : true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    maxAge: 86400, // Cache preflight requests for 24 hours
  });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Coinflip Game API')
    .setDescription('Real-time multiplayer coin flip game backend with WebSocket support')
    .setVersion('1.0')
    .addTag('game', 'Game room operations')
    .addTag('websocket', 'WebSocket events for real-time communication')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Coinflip Game API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  });

  const port = process.env.PORT || 8080;
  await app.listen(port);

  logger.log(`🚀 Coinflip game backend is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger documentation available at: http://localhost:${port}/api/docs`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`🔒 Security features enabled: Exception filter, Rate limiting, Input validation`);

  // Log configuration summary
  const configSummary = EnvironmentValidator.getConfigSummary();
  logger.log('Configuration summary:', configSummary);
}
bootstrap();