import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_FILTER } from '@nestjs/core';

import { ConfigurationModule } from '@/config/config.module';
import { AuthModule } from '@/auth/auth.module';
import { GatewayModule } from '@/gateway/gateway.module';
import { HealthModule } from '@/health/health.module';
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';
import { CorrelationIdMiddleware } from '@/common/middleware/correlation-id.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute per IP
      },
      {
        name: 'long',
        ttl: 60000, // 1 minute
        limit: 300, // 300 requests per minute for authenticated users
      },
    ]),
    ConfigurationModule,
    AuthModule,
    GatewayModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
