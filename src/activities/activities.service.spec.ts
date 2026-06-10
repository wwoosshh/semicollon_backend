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

describe('ActivitiesService', () => {
  it('lists activities newest-year-first, filtered by type', async () => {
    const prisma = makePrisma();
    const svc = new ActivitiesService(prisma);
    await svc.list('project');
    expect(prisma.activities.findMany).toHaveBeenCalledWith({
      where: { type: 'project' },
      orderBy: [{ year: 'desc' }, { created_at: 'desc' }],
    });
  });

  it('404s on a missing activity', async () => {
    const svc = new ActivitiesService(makePrisma());
    await expect(svc.getOne(99)).rejects.toThrow(NotFoundException);
  });

  it('creates an activity', async () => {
    const prisma = makePrisma();
    const svc = new ActivitiesService(prisma);
    await svc.create({
      title: 't',
      description: 'd',
      type: 'study',
      year: 2026,
    } as any);
    expect(prisma.activities.create).toHaveBeenCalled();
  });
});
