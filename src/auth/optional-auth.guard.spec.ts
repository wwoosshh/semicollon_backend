import { OptionalAuthGuard } from './optional-auth.guard';
import { JwtVerifier } from './jwt.verifier';

function mockContext(authHeader?: string) {
  const req: any = { headers: { authorization: authHeader } };
  return {
    ctx: { switchToHttp: () => ({ getRequest: () => req }) } as any,
    req,
  };
}

describe('OptionalAuthGuard', () => {
  it('passes without a token and leaves req.user unset', async () => {
    const guard = new OptionalAuthGuard(new JwtVerifier());
    const { ctx, req } = mockContext(undefined);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toBeUndefined();
  });

  it('sets req.user when a valid token is present', async () => {
    const verifier = { verify: jest.fn().mockResolvedValue({ sub: 'u1' }) };
    const guard = new OptionalAuthGuard(verifier);
    const { ctx, req } = mockContext('Bearer token');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toEqual({ id: 'u1' });
  });

  it('passes (as anonymous) when token is invalid', async () => {
    const verifier = { verify: jest.fn().mockRejectedValue(new Error('bad')) };
    const guard = new OptionalAuthGuard(verifier);
    const { ctx, req } = mockContext('Bearer bad');
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toBeUndefined();
  });
});
