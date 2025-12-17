import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthService } from './jwt-auth.service';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private jwtAuthService: JwtAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const authorizationHeader = request.headers.authorization;

    try {
      const token = this.jwtAuthService.extractTokenFromHeader(
        authorizationHeader,
      );
      const userContext = this.jwtAuthService.validateToken(token);

      // Attach user context to request
      (request as any).userContext = userContext;
      return true;
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}
