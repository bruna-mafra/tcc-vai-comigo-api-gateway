import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpClientService } from '@/gateway/http-client.service';
import { GatewayConfigService } from '@/config/gateway-config.service';

export interface ServiceHealthStatus {
  [service: string]: 'UP' | 'DOWN';
}

export interface HealthCheckResponse {
  status: 'UP' | 'DOWN';
  services: ServiceHealthStatus;
  timestamp: string;
}

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly serviceUrls: any;
  private readonly HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

  constructor(
    private httpClientService: HttpClientService,
    private gatewayConfigService: GatewayConfigService,
  ) {
    this.serviceUrls = this.gatewayConfigService.getConfig().services;
  }

  async checkHealth(): Promise<HealthCheckResponse> {
    const services = Object.keys(this.serviceUrls);
    const healthStatus: ServiceHealthStatus = {};

    const healthChecks = services.map((service) =>
      this.checkServiceHealth(service, this.serviceUrls[service]),
    );

    const results = await Promise.allSettled(healthChecks);

    results.forEach((result, index) => {
      const service = services[index];
      healthStatus[service] =
        result.status === 'fulfilled' && result.value ? 'UP' : 'DOWN';
    });

    const overallStatus = Object.values(healthStatus).every((s) => s === 'UP')
      ? 'UP'
      : 'DOWN';

    return {
      status: overallStatus,
      services: healthStatus,
      timestamp: new Date().toISOString(),
    };
  }

  private async checkServiceHealth(
    serviceName: string,
    serviceUrl: string,
  ): Promise<boolean> {
    try {
      const response = await this.httpClientService.forwardRequest({
        method: 'GET',
        path: '/health',
        headers: {},
        baseUrl: serviceUrl,
        correlationId: 'health-check',
      });

      return response.status === 200 || response.status === 204;
    } catch (error) {
      this.logger.warn(`Health check failed for ${serviceName}: ${error.message}`);
      return false;
    }
  }
}
