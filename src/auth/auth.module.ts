import { Module } from '@nestjs/common';
import { JwtVerifier } from './jwt.verifier';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { OptionalAuthGuard } from './optional-auth.guard';

@Module({
  providers: [JwtVerifier, AuthGuard, RolesGuard, OptionalAuthGuard],
  exports: [JwtVerifier, AuthGuard, RolesGuard, OptionalAuthGuard],
})
export class AuthModule {}
