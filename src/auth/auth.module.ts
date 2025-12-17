import { Module } from '@nestjs/common';
import { JwtAuthService } from './jwt-auth.service';
import { JwtGuard } from './jwt.guard';
import { RolesGuard } from './roles.guard';

@Module({
  providers: [JwtAuthService, JwtGuard, RolesGuard],
  exports: [JwtAuthService, JwtGuard, RolesGuard],
})
export class AuthModule {}
