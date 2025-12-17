import { Controller, Get, HttpCode } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService, HealthCheckResponse } from './health-check.service';

@Controller('health')
export class HealthCheckController {
  constructor(private healthCheckService: HealthCheckService) {}

  @Get()
  @HttpCode(200)
  @ApiOperation({ summary: 'API Gateway health check' })
  @ApiResponse({
    status: 200,
    description: 'Health status with all microservices',
  })
  async getHealth(): Promise<HealthCheckResponse> {
    return this.healthCheckService.checkHealth();
  }
}
