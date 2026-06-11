import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MembersService } from './members.service';

function mockProfileCache() {
  return {
    getRole: jest.fn().mockResolvedValue(null),
    invalidate: jest.fn().mockResolvedValue(undefined),
  } as any;
}

function makeService(
  prismaOverrides: Partial<any> = {},
  supabaseOverrides: Partial<any> = {},
) {
  const prisma = {
    profiles: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(2),
    },
    ...prismaOverrides,
  } as any;

  const supabase = {
    deleteUser: jest.fn().mockResolvedValue({ error: null }),
    ...supabaseOverrides,
  } as any;

  const profileCache = mockProfileCache();

  return {
    svc: new MembersService(prisma, supabase, profileCache),
    prisma,
    supabase,
    profileCache,
  };
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

    // auth.users 전체(암호 해시 포함)가 아니라 email만 읽어야 한다
    expect(prisma.profiles.findMany).toHaveBeenCalledWith({
      include: { users: { select: { email: true } } },
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

    const { svc, prisma, profileCache } = makeService({
      profiles: {
        findMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue(mockProfile),
        update: jest.fn().mockResolvedValue({ ...mockProfile, role: 'admin' }),
      },
    });

    const result = await svc.updateRole(
      'requester-uuid',
      'target-uuid',
      'admin',
    );

    expect(prisma.profiles.findUnique).toHaveBeenCalledWith({
      where: { id: 'target-uuid' },
    });
    expect(prisma.profiles.update).toHaveBeenCalledWith({
      where: { id: 'target-uuid' },
      data: { role: 'admin' },
    });
    expect(result.role).toBe('admin');
    expect(profileCache.invalidate).toHaveBeenCalledWith('target-uuid');
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
    await expect(svc.deleteMember('same-uuid', 'same-uuid')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deleteMember calls supabase.deleteUser for a different member', async () => {
    const { svc, supabase, profileCache } = makeService();
    await svc.deleteMember('requester-uuid', 'target-uuid');
    expect(supabase.deleteUser).toHaveBeenCalledWith('target-uuid');
    expect(profileCache.invalidate).toHaveBeenCalledWith('target-uuid');
  });

  it('updateRole throws BadRequestException when demoting the last admin', async () => {
    const { svc, prisma } = makeService({
      profiles: {
        findMany: jest.fn(),
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'target-uuid', role: 'admin' }),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
    });

    await expect(
      svc.updateRole('requester-uuid', 'target-uuid', 'member'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.profiles.update).not.toHaveBeenCalled();
  });

  it('updateRole allows demoting an admin when another admin remains', async () => {
    const { svc, prisma } = makeService({
      profiles: {
        findMany: jest.fn(),
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'target-uuid', role: 'admin' }),
        update: jest
          .fn()
          .mockResolvedValue({ id: 'target-uuid', role: 'member' }),
        count: jest.fn().mockResolvedValue(2),
      },
    });

    const result = await svc.updateRole(
      'requester-uuid',
      'target-uuid',
      'member',
    );
    expect(result.role).toBe('member');
  });

  it('deleteMember throws BadRequestException when deleting the last admin', async () => {
    const { svc, supabase } = makeService({
      profiles: {
        findMany: jest.fn(),
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'target-uuid', role: 'admin' }),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(1),
      },
    });

    await expect(
      svc.deleteMember('requester-uuid', 'target-uuid'),
    ).rejects.toThrow(BadRequestException);
    expect(supabase.deleteUser).not.toHaveBeenCalled();
  });

  it('updateRole invalidates the role cache before and after the update', async () => {
    const { svc, prisma, profileCache } = makeService({
      profiles: {
        findMany: jest.fn(),
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'target-uuid', role: 'member' }),
        update: jest
          .fn()
          .mockResolvedValue({ id: 'target-uuid', role: 'admin' }),
        count: jest.fn().mockResolvedValue(2),
      },
    });

    await svc.updateRole('requester-uuid', 'target-uuid', 'admin');

    // 업데이트 직전·직후 모두 무효화 — 그 사이 이전 역할이 재캐싱되는 창 제거
    expect(profileCache.invalidate).toHaveBeenCalledTimes(2);
    const firstInvalidate = profileCache.invalidate.mock.invocationCallOrder[0];
    const updateCall = prisma.profiles.update.mock.invocationCallOrder[0];
    expect(firstInvalidate).toBeLessThan(updateCall);
  });

  it('updateRole maps P2025 to NotFoundException when target vanishes mid-update', async () => {
    const { svc } = makeService({
      profiles: {
        findMany: jest.fn(),
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'target-uuid', role: 'member' }),
        update: jest
          .fn()
          .mockRejectedValue(
            Object.assign(new Error('Record not found'), { code: 'P2025' }),
          ),
        count: jest.fn().mockResolvedValue(2),
      },
    });

    await expect(
      svc.updateRole('requester-uuid', 'target-uuid', 'admin'),
    ).rejects.toThrow(NotFoundException);
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
