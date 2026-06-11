import { NotFoundException } from '@nestjs/common';
import { MeController } from './me.controller';

describe('MeController', () => {
  it('returns the profile of the authenticated user', async () => {
    const prisma = {
      profiles: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1',
          name: '홍길동',
          generation: 3,
          role: 'member',
        }),
      },
    } as any;
    const controller = new MeController(prisma);
    await expect(controller.me({ user: { id: 'u1' } } as any)).resolves.toEqual(
      {
        id: 'u1',
        name: '홍길동',
        generation: 3,
        role: 'member',
      },
    );
  });

  it('404s when profile is missing', async () => {
    const prisma = {
      profiles: { findUnique: jest.fn().mockResolvedValue(null) },
    } as any;
    const controller = new MeController(prisma);
    await expect(
      controller.me({ user: { id: 'ghost' } } as any),
    ).rejects.toThrow(NotFoundException);
  });
});
