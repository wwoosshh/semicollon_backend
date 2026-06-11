import { NotFoundException } from '@nestjs/common';
import { ActivitiesService } from './activities.service';

function makePrisma(overrides: any = {}) {
  return {
    activities: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      ...overrides,
    },
  } as any;
}

function mockCache() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  } as any;
}

describe('ActivitiesService', () => {
  it('lists activities newest-year-first, filtered by type', async () => {
    const prisma = makePrisma();
    const svc = new ActivitiesService(prisma, mockCache());
    await svc.list('project');
    expect(prisma.activities.findMany).toHaveBeenCalledWith({
      where: { type: 'project' },
      orderBy: [{ year: 'desc' }, { created_at: 'desc' }],
    });
  });

  it('404s on a missing activity', async () => {
    const svc = new ActivitiesService(makePrisma(), mockCache());
    await expect(svc.getOne(99)).rejects.toThrow(NotFoundException);
  });

  it('creates an activity', async () => {
    const prisma = makePrisma();
    const svc = new ActivitiesService(prisma, mockCache());
    await svc.create({
      title: 't',
      description: 'd',
      type: 'study',
      year: 2026,
    } as any);
    expect(prisma.activities.create).toHaveBeenCalled();
  });

  it('returns cached list without hitting prisma on cache hit', async () => {
    const prisma = makePrisma();
    const cache = mockCache();
    const cachedActivities = [{ id: 1, title: 'cached activity' }];
    cache.get.mockResolvedValue(cachedActivities);
    const svc = new ActivitiesService(prisma, cache);

    const result = await svc.list(undefined);
    expect(result).toBe(cachedActivities);
    expect(prisma.activities.findMany).not.toHaveBeenCalled();
  });

  it('skips the cache for a non-whitelisted type', async () => {
    const prisma = makePrisma();
    const cache = mockCache();
    const svc = new ActivitiesService(prisma, cache);

    await svc.list('zzz');
    expect(cache.get).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
    expect(prisma.activities.findMany).toHaveBeenCalled();
  });

  it('invalidates all activity cache keys after create', async () => {
    const prisma = makePrisma();
    const cache = mockCache();
    const svc = new ActivitiesService(prisma, cache);

    await svc.create({
      title: 't',
      description: 'd',
      type: 'study',
      year: 2026,
    } as any);
    expect(cache.del).toHaveBeenCalledWith(
      'activities:all',
      'activities:project',
      'activities:study',
      'activities:event',
    );
  });
});
