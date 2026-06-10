import { Module } from '@nestjs/common';
import { JwtVerifier } from './jwt.verifier';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';

@Module({
  providers: [JwtVerifier, AuthGuard, RolesGuard],
  exports: [JwtVerifier, AuthGuard, RolesGuard],
})
export class AuthModule {}
