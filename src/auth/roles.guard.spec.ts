import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function mockContext(user?: { id: string }) {
  const req: any = { user };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any;
}

describe('RolesGuard', () => {
  function makeGuard(requiredRoles: string[] | undefined, dbRole?: string) {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(requiredRoles),
    } as unknown as Reflector;
    const profileCache = {
      getRole: jest.fn().mockResolvedValue(dbRole ?? null),
    } as any;
    return new RolesGuard(reflector, profileCache);
  }

  it('allows when no roles are required', async () => {
    const guard = makeGuard(undefined);
    await expect(guard.canActivate(mockContext({ id: 'u1' }))).resolves.toBe(
      true,
    );
  });

  it('allows admin when admin is required', async () => {
    const guard = makeGuard(['admin'], 'admin');
    await expect(guard.canActivate(mockContext({ id: 'u1' }))).resolves.toBe(
      true,
    );
  });

  it('rejects member when admin is required', async () => {
    const guard = makeGuard(['admin'], 'member');
    await expect(guard.canActivate(mockContext({ id: 'u1' }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects when profile does not exist', async () => {
    const guard = makeGuard(['admin'], undefined);
    await expect(guard.canActivate(mockContext({ id: 'u1' }))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects with 401 when req.user is missing (guard misordering)', async () => {
    const guard = makeGuard(['admin'], 'admin');
    await expect(guard.canActivate(mockContext(undefined))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
