import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HealthCheckController } from './health-check.controller';
import { HealthCheckService } from './health-check.service';
import { ConfigurationModule } from '@/config/config.module';
import { HttpClientService } from '@/gateway/http-client.service';

@Module({
  imports: [HttpModule, ConfigurationModule],
  controllers: [HealthCheckController],
  providers: [HealthCheckService, HttpClientService],
})
export class HealthModule {}
