import { UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { JwtVerifier } from './jwt.verifier';

function mockContext(authHeader?: string) {
  const req: any = { headers: { authorization: authHeader } };
  return {
    ctx: {
      switchToHttp: () => ({ getRequest: () => req }),
    } as any,
    req,
  };
}

describe('AuthGuard', () => {
  it('rejects requests without a bearer token', async () => {
    const guard = new AuthGuard(new JwtVerifier());
    const { ctx } = mockContext(undefined);
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('sets req.user.id from a valid token', async () => {
    const verifier = {
      verify: jest.fn().mockResolvedValue({ sub: 'user-uuid' }),
    };
    const guard = new AuthGuard(verifier);
    const { ctx, req } = mockContext('Bearer some-valid-token');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({ id: 'user-uuid' });
  });

  it('rejects when verification fails', async () => {
    const verifier = { verify: jest.fn().mockRejectedValue(new Error('bad')) };
    const guard = new AuthGuard(verifier);
    const { ctx } = mockContext('Bearer tampered');
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
