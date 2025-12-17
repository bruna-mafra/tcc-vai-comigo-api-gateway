import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GatewayConfig, ServiceUrl } from '@/types';

@Injectable()
export class GatewayConfigService {
  constructor(private configService: ConfigService) {}

  getConfig(): GatewayConfig {
    return {
      port: this.configService.get('PORT', 3000),
      jwtSecret: this.configService.get('JWT_SECRET'),
      jwtIssuer: this.configService.get('JWT_ISSUER', 'vai-comigo'),
      jwtAudience: this.configService.get('JWT_AUDIENCE', 'vai-comigo-client'),
      jwtExpiration: this.configService.get('JWT_EXPIRATION', '24h'),
      services: this.getServiceUrls(),
      rateLimitTtl: this.configService.get('RATE_LIMIT_TTL', 60000),
      rateLimitLimit: this.configService.get('RATE_LIMIT_LIMIT', 100),
      rateLimitLimitAuthenticated: this.configService.get(
        'RATE_LIMIT_LIMIT_AUTHENTICATED',
        300,
      ),
      logLevel: this.configService.get('LOG_LEVEL', 'debug'),
      nodeEnv: this.configService.get('NODE_ENV', 'development'),
    };
  }

  private getServiceUrls(): ServiceUrl {
    return {
      users: this.configService.get('USER_SERVICE_URL'),
      rides: this.configService.get('RIDE_SERVICE_URL'),
      chat: this.configService.get('CHAT_SERVICE_URL'),
      maps: this.configService.get('MAPS_SERVICE_URL'),
      reviews: this.configService.get('REVIEW_SERVICE_URL'),
    };
  }
}
