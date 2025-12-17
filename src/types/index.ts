import { v4 as uuidv4 } from 'uuid';

export interface UserContext {
  userId: string;
  role: 'USER' | 'ADMIN';
}

export interface RequestContext {
  correlationId: string;
  userContext?: UserContext;
  timestamp: Date;
}

export interface ServiceUrl {
  users: string;
  rides: string;
  chat: string;
  maps: string;
  reviews: string;
}

export interface GatewayConfig {
  port: number;
  jwtSecret: string;
  jwtIssuer: string;
  jwtAudience: string;
  jwtExpiration: string;
  services: ServiceUrl;
  rateLimitTtl: number;
  rateLimitLimit: number;
  rateLimitLimitAuthenticated: number;
  logLevel: string;
  nodeEnv: string;
}
