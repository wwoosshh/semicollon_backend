import { Module } from '@nestjs/common';
import { JwtVerifier } from './jwt.verifier';
import { AuthGuard } from './auth.guard';

@Module({
  providers: [JwtVerifier, AuthGuard],
  exports: [JwtVerifier, AuthGuard],
})
export class AuthModule {}
