import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';

function makeController(queryRaw: jest.Mock) {
  const prisma = { $queryRaw: queryRaw } as any;
  return new (HealthController as any)(prisma) as HealthController;
}

describe('HealthController', () => {
  it('GET /health returns ok when the DB responds', async () => {
    const controller = makeController(
      jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    );
    await expect(controller.check()).resolves.toEqual({ status: 'ok' });
  });

  it('GET /health throws 503 when the DB is unreachable', async () => {
    const controller = makeController(
      jest.fn().mockRejectedValue(new Error('connection refused')),
    );
    await expect(controller.check()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
