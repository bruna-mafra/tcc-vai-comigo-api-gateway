import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GatewayConfigService } from './gateway-config.service';

@Module({
  imports: [ConfigModule],
  providers: [GatewayConfigService],
  exports: [GatewayConfigService],
})
export class ConfigurationModule {}
