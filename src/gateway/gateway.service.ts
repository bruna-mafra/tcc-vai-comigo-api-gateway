import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpClientService } from './http-client.service';
import { RouteMapService } from './route-map.service';
import { GatewayConfigService } from '@/config/gateway-config.service';
import { JwtAuthService } from '@/auth/jwt-auth.service';
import { UserContext, RequestContext } from '@/types';
import { AxiosResponse } from 'axios';
import { Request } from 'express';

export interface GatewayRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, any>;
  correlationId: string;
  userContext?: UserContext;
}

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);
  private readonly serviceUrls: any;

  constructor(
    private httpClientService: HttpClientService,
    private gatewayConfigService: GatewayConfigService,
    private jwtAuthService: JwtAuthService,
  ) {
    this.serviceUrls = this.gatewayConfigService.getConfig().services;
  }

  async handleRequest(req: Request, correlationId: string): Promise<any> {
    const requestPath = req.path;
    const method = req.method;
    const headers = this.getRelevantHeaders(req.headers);
    const body = req.body;
    const query = req.query;

    this.logger.debug(
      `Gateway received ${method} ${requestPath} (correlationId: ${correlationId})`,
    );

    // Find the matching route
    const routeMapping = RouteMapService.getRouteMapping(
      requestPath,
      this.serviceUrls,
    );

    if (!routeMapping) {
      this.logger.warn(
        `No route mapping found for ${requestPath} (correlationId: ${correlationId})`,
      );
      throw new BadRequestException(`No route found for ${requestPath}`);
    }

    // Check authorization
    const isPublic = routeMapping.public ?? false;
    let userContext: UserContext | undefined;

    if (!isPublic) {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new BadRequestException('Missing Authorization header');
      }

      try {
        const token = this.jwtAuthService.extractTokenFromHeader(authHeader);
        userContext = this.jwtAuthService.validateToken(token);
      } catch (error) {
        throw error;
      }
    }

    // Check role-based authorization
    if (routeMapping.roles && userContext) {
      const hasRequiredRole = routeMapping.roles.includes(userContext.role);
      if (!hasRequiredRole) {
        this.logger.warn(
          `Access denied to ${requestPath} for role ${userContext.role} (correlationId: ${correlationId})`,
        );
        throw new BadRequestException(
          `Insufficient permissions. Required roles: ${routeMapping.roles.join(', ')}`,
        );
      }
    }

    // Forward the request
    try {
      const response = await this.httpClientService.forwardRequest({
        method,
        path: this.extractServicePath(requestPath, routeMapping.prefix),
        headers,
        body,
        query: query as Record<string, any>,
        baseUrl: routeMapping.serviceUrl,
        correlationId,
      });

      return {
        statusCode: response.status,
        data: response.data,
        headers: response.headers,
      };
    } catch (error) {
      this.logger.error(
        `Error forwarding request to service for ${requestPath} (correlationId: ${correlationId}): ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Service temporarily unavailable');
    }
  }

  private getRelevantHeaders(
    headers: Record<string, string | string[]>,
  ): Record<string, string> {
    const relevantHeaders = [
      'content-type',
      'content-length',
      'user-agent',
      'accept',
      'accept-language',
      'accept-encoding',
      'cache-control',
      'origin',
      'referer',
      'x-requested-with',
      'authorization',
    ];

    const filtered: Record<string, string> = {};
    for (const header of relevantHeaders) {
      if (headers[header]) {
        const value = headers[header];
        filtered[header] = Array.isArray(value) ? value[0] : value;
      }
    }

    return filtered;
  }

  private extractServicePath(
    requestPath: string,
    routePrefix: string,
  ): string {
    // If the route prefix matches exactly, pass the remaining path
    if (requestPath === routePrefix) {
      return '';
    }

    // Otherwise, remove the route prefix and keep the rest
    return requestPath.slice(routePrefix.length);
  }
}
