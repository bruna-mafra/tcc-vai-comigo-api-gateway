import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GatewayConfigService } from './config/gateway-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // Get configuration
  const configService = app.get(GatewayConfigService);
  const config = configService.getConfig();

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger/OpenAPI setup
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Vai Comigo - API Gateway')
    .setDescription(
      'Central entry point for the Vai Comigo backend. Routes requests to microservices.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter JWT token',
      },
      'JWT',
    )
    .addTag('Public', 'Public endpoints')
    .addTag('Authentication', 'User authentication')
    .addTag('Users', 'User management')
    .addTag('Rides', 'Ride management')
    .addTag('Chat', 'Chat and messaging')
    .addTag('Maps', 'Maps and location')
    .addTag('Reviews', 'Reviews and ratings')
    .addTag('Health', 'System health')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Start server
  const port = config.port;
  await app.listen(port);

  logger.log(`🚀 API Gateway running on http://localhost:${port}`);
  logger.log(`📚 Swagger documentation at http://localhost:${port}/api/docs`);
  logger.log(`🏥 Health check at http://localhost:${port}/health`);
}

bootstrap().catch((error) => {
  console.error('Failed to start API Gateway:', error);
  process.exit(1);
});
