import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { HttpClientService } from './http-client.service';
import { ConfigurationModule } from '@/config/config.module';
import { AuthModule } from '@/auth/auth.module';

@Module({
  imports: [HttpModule, ConfigModule, ConfigurationModule, AuthModule],
  controllers: [GatewayController],
  providers: [GatewayService, HttpClientService],
})
export class GatewayModule {}
