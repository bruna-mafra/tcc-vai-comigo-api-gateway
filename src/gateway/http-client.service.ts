import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom, timeout } from 'rxjs';
import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { RequestContext } from '@/types';

export interface ForwardRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: any;
  query?: Record<string, any>;
  baseUrl: string;
  correlationId: string;
}

@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private readonly MAX_RETRIES = 3;

  constructor(private httpService: HttpService) {}

  async forwardRequest(request: ForwardRequest): Promise<AxiosResponse> {
    const { method, path, headers, body, query, baseUrl, correlationId } =
      request;

    const url = `${baseUrl}${path}`;
    const enrichedHeaders = {
      ...headers,
      'x-correlation-id': correlationId,
      'x-forwarded-by': 'vai-comigo-api-gateway',
    };

    // Remove hop-by-hop headers
    delete enrichedHeaders['connection'];
    delete enrichedHeaders['keep-alive'];
    delete enrichedHeaders['transfer-encoding'];
    delete enrichedHeaders['upgrade'];

    const config: AxiosRequestConfig = {
      method: method as any,
      url,
      headers: enrichedHeaders,
      params: query,
      validateStatus: () => true, // Accept all status codes
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      config.data = body;
    }

    try {
      this.logger.debug(
        `Forwarding ${method} request to ${url} (correlationId: ${correlationId})`,
      );

      const response = await lastValueFrom(
        this.httpService
          .request(config)
          .pipe(timeout(this.REQUEST_TIMEOUT)),
      );

      this.logger.debug(
        `Response from ${url}: ${response.status} (correlationId: ${correlationId})`,
      );

      return response;
    } catch (error) {
      this.logger.error(
        `Error forwarding request to ${url}: ${error.message} (correlationId: ${correlationId})`,
        error.stack,
      );
      throw error;
    }
  }
}
