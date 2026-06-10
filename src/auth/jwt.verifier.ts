import { Injectable } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

@Injectable()
export class JwtVerifier {
  private jwks?: ReturnType<typeof createRemoteJWKSet>;

  async verify(token: string): Promise<JWTPayload> {
    this.jwks ??= createRemoteJWKSet(
      new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
    );
    const { payload } = await jwtVerify(token, this.jwks, {
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
      audience: 'authenticated',
    });
    return payload;
  }
}
