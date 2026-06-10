import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MembersService } from './members.service';

function makeService(
  prismaOverrides: Partial<any> = {},
  supabaseOverrides: Partial<any> = {},
) {
  const prisma = {
    profiles: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
    },
    ...prismaOverrides,
  } as any;

  const supabase = {
    deleteUser: jest.fn().mockResolvedValue({ error: null }),
    ...supabaseOverrides,
  } as any;

  return { svc: new MembersService(prisma, supabase), prisma, supabase };
}

describe('MembersService', () => {
  it('list returns profiles with email included', async () => {
    const mockProfiles = [
      {
        id: 'uuid-1',
        name: '홍길동',
        generation: 1,
        role: 'member',
        created_at: new Date('2024-01-01'),
        users: { email: 'hong@example.com' },
      },
      {
        id: 'uuid-2',
        name: '김철수',
        generation: 2,
        role: 'admin',
        created_at: new Date('2024-02-01'),
        users: { email: 'kim@example.com' },
      },
    ];

    const { svc, prisma } = makeService({
      profiles: {
        findMany: jest.fn().mockResolvedValue(mockProfiles),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    });

    const result = await svc.list();

    expect(prisma.profiles.findMany).toHaveBeenCalledWith({
      include: { users: true },
      orderBy: [{ generation: 'asc' }, { name: 'asc' }],
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'uuid-1',
      name: '홍길동',
      generation: 1,
      role: 'member',
      created_at: new Date('2024-01-01'),
      email: 'hong@example.com',
    });
    expect(result[1].email).toBe('kim@example.com');
  });

  it('updateRole throws BadRequestException when requester tries to change own role', async () => {
    const { svc } = makeService();
    await expect(
      svc.updateRole('same-uuid', 'same-uuid', 'member'),
    ).rejects.toThrow(BadRequestException);
  });

  it('updateRole successfully updates another member role', async () => {
    const mockProfile = {
      id: 'target-uuid',
      name: '홍길동',
      generation: 1,
      role: 'member',
      created_at: new Date(),
    };

    const { svc, prisma } = makeService({
      profiles: {
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(mockProfile),
        update: jest.fn().mockResolvedValue({ ...mockProfile, role: 'admin' }),
      },
    });

    const result = await svc.updateRole('requester-uuid', 'target-uuid', 'admin');

    expect(prisma.profiles.findUnique).toHaveBeenCalledWith({
      where: { id: 'target-uuid' },
    });
    expect(prisma.profiles.update).toHaveBeenCalledWith({
      where: { id: 'target-uuid' },
      data: { role: 'admin' },
    });
    expect(result.role).toBe('admin');
  });

  it('updateRole throws NotFoundException when target profile does not exist', async () => {
    const { svc } = makeService({
      profiles: {
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    });

    await expect(
      svc.updateRole('requester-uuid', 'nonexistent-uuid', 'admin'),
    ).rejects.toThrow(NotFoundException);
  });

  it('deleteMember throws BadRequestException when requester tries to delete themselves', async () => {
    const { svc } = makeService();
    await expect(
      svc.deleteMember('same-uuid', 'same-uuid'),
    ).rejects.toThrow(BadRequestException);
  });

  it('deleteMember calls supabase.deleteUser for a different member', async () => {
    const { svc, supabase } = makeService();
    await svc.deleteMember('requester-uuid', 'target-uuid');
    expect(supabase.deleteUser).toHaveBeenCalledWith('target-uuid');
  });

  it('deleteMember throws BadRequestException when supabase returns an error', async () => {
    const { svc } = makeService(
      {},
      {
        deleteUser: jest
          .fn()
          .mockResolvedValue({ error: { message: '삭제 실패' } }),
      },
    );

    await expect(
      svc.deleteMember('requester-uuid', 'target-uuid'),
    ).rejects.toThrow(BadRequestException);
  });
});
