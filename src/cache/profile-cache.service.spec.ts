import { ProfileCacheService } from './profile-cache.service';

function makePrisma(role?: string | null) {
  return {
    profiles: {
      findUnique: jest.fn().mockResolvedValue(
        role !== undefined ? { id: 'u1', role } : null,
      ),
    },
  } as any;
}

function makeCache() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  } as any;
}

describe('ProfileCacheService', () => {
  it('returns cached role without hitting prisma on cache hit', async () => {
    const prisma = makePrisma('admin');
    const cache = makeCache();
    cache.get.mockResolvedValue('admin');
    const svc = new ProfileCacheService(prisma, cache);

    const role = await svc.getRole('u1');
    expect(role).toBe('admin');
    expect(prisma.profiles.findUnique).not.toHaveBeenCalled();
  });

  it('queries prisma and caches result on cache miss', async () => {
    const prisma = makePrisma('member');
    const cache = makeCache();
    const svc = new ProfileCacheService(prisma, cache);

    const role = await svc.getRole('u1');
    expect(role).toBe('member');
    expect(prisma.profiles.findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: { role: true },
    });
    expect(cache.set).toHaveBeenCalledWith('profile-role:u1', 'member', 60);
  });

  it('returns null and caches null-sentinel for 15s when profile does not exist', async () => {
    const prisma = makePrisma(undefined);
    const cache = makeCache();
    // prisma returns null (no profile)
    prisma.profiles.findUnique.mockResolvedValue(null);
    const svc = new ProfileCacheService(prisma, cache);

    const role = await svc.getRole('ghost');
    expect(role).toBeNull();
    expect(cache.set).toHaveBeenCalledWith('profile-role:ghost', '__null__', 15);
  });

  it('invalidate calls cache.del for the user key', async () => {
    const prisma = makePrisma('member');
    const cache = makeCache();
    const svc = new ProfileCacheService(prisma, cache);

    await svc.invalidate('u1');
    expect(cache.del).toHaveBeenCalledWith('profile-role:u1');
  });
});
