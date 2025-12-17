import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { UserContext } from '@/types';

@Injectable()
export class JwtAuthService {
  private readonly logger = new Logger(JwtAuthService.name);
  private jwtSecret: string;
  private jwtIssuer: string;

  constructor(private configService: ConfigService) {
    this.jwtSecret = this.configService.get('JWT_SECRET');
    this.jwtIssuer = this.configService.get('JWT_ISSUER', 'vai-comigo');
  }

  validateToken(token: string): UserContext {
    try {
      const decoded = jwt.verify(token, this.jwtSecret, {
        issuer: this.jwtIssuer,
      }) as any;

      if (!decoded.userId || !decoded.role) {
        throw new UnauthorizedException(
          'Invalid token claims: missing userId or role',
        );
      }

      return {
        userId: decoded.userId,
        role: decoded.role,
      };
    } catch (error) {
      this.logger.debug(`JWT validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  extractTokenFromHeader(authorizationHeader: string): string {
    if (!authorizationHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const parts = authorizationHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      throw new UnauthorizedException(
        'Invalid Authorization header format. Expected: Bearer <token>',
      );
    }

    return parts[1];
  }
}
