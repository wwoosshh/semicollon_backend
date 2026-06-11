import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';

function makePrisma(overrides: any = {}) {
  return {
    events: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      ...overrides,
    },
  } as any;
}

describe('EventsService', () => {
  it('calls findMany with starts_at range filter and asc order', async () => {
    const prisma = makePrisma();
    const svc = new EventsService(prisma);
    const from = '2026-01-01T00:00:00.000Z';
    const to = '2026-12-31T23:59:59.000Z';
    await svc.list(from, to);
    expect(prisma.events.findMany).toHaveBeenCalledWith({
      where: {
        starts_at: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      orderBy: { starts_at: 'asc' },
    });
  });

  it('creates an event successfully', async () => {
    const prisma = makePrisma();
    const svc = new EventsService(prisma);
    await svc.create({
      title: 'Test Event',
      startsAt: '2026-03-01T10:00:00.000Z',
    });
    expect(prisma.events.create).toHaveBeenCalled();
  });

  it('rejects creation when endsAt is before startsAt', async () => {
    const svc = new EventsService(makePrisma());
    await expect(
      svc.create({
        title: 'Bad Event',
        startsAt: '2026-03-10T10:00:00.000Z',
        endsAt: '2026-03-01T10:00:00.000Z',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws 404 when updating a non-existent event', async () => {
    const svc = new EventsService(makePrisma());
    await expect(svc.update(999, { title: 'x' } as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects an endsAt-only update that precedes the existing starts_at', async () => {
    const prisma = makePrisma({
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        starts_at: new Date('2026-03-10T10:00:00.000Z'),
        ends_at: null,
      }),
    });
    const svc = new EventsService(prisma);
    await expect(
      svc.update(1, { endsAt: '2026-03-01T10:00:00.000Z' } as any),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.events.update).not.toHaveBeenCalled();
  });

  it('allows an endsAt-only update that follows the existing starts_at', async () => {
    const prisma = makePrisma({
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        starts_at: new Date('2026-03-10T10:00:00.000Z'),
        ends_at: null,
      }),
    });
    const svc = new EventsService(prisma);
    await svc.update(1, { endsAt: '2026-03-11T10:00:00.000Z' });
    expect(prisma.events.update).toHaveBeenCalled();
  });

  it('rejects a startsAt-only update that passes the existing ends_at', async () => {
    const prisma = makePrisma({
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        starts_at: new Date('2026-03-10T10:00:00.000Z'),
        ends_at: new Date('2026-03-12T10:00:00.000Z'),
      }),
    });
    const svc = new EventsService(prisma);
    await expect(
      svc.update(1, { startsAt: '2026-03-15T10:00:00.000Z' } as any),
    ).rejects.toThrow(BadRequestException);
  });
});
