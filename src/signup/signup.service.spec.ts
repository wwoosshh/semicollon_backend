import { BadRequestException } from '@nestjs/common';
import { SignupService } from './signup.service';

describe('SignupService', () => {
  const dto = {
    email: 'a@b.c',
    password: 'pw123456',
    name: '홍길동',
    generation: 3,
    inviteCode: 'GOOD-CODE',
  };

  function makeService(opts: {
    storedCode?: string | null;
    createUserResult?: { data: any; error: any };
    profileCreateFails?: boolean;
  }) {
    // 초대 코드 검증은 해시 비교를 캡슐화한 settings.verifyInviteCode에 위임한다
    const settings = {
      verifyInviteCode: jest
        .fn()
        .mockImplementation((code: string) =>
          Promise.resolve(opts.storedCode !== null && code === opts.storedCode),
        ),
    } as any;
    const supabase = {
      createUser: jest.fn().mockResolvedValue(
        opts.createUserResult ?? {
          data: { user: { id: 'new-uuid' } },
          error: null,
        },
      ),
      deleteUser: jest.fn().mockResolvedValue({ data: null, error: null }),
    } as any;
    const prisma = {
      profiles: {
        create: opts.profileCreateFails
          ? jest.fn().mockRejectedValue(new Error('db down'))
          : jest.fn().mockResolvedValue({}),
      },
    } as any;
    return {
      svc: new SignupService(settings, supabase, prisma),
      supabase,
      prisma,
    };
  }

  it('rejects a wrong invite code', async () => {
    const { svc } = makeService({ storedCode: 'OTHER' });
    await expect(svc.signup(dto)).rejects.toThrow(BadRequestException);
  });

  it('creates auth user and member profile on valid code', async () => {
    const { svc, supabase, prisma } = makeService({ storedCode: 'GOOD-CODE' });
    await svc.signup(dto);
    expect(supabase.createUser).toHaveBeenCalledWith('a@b.c', 'pw123456');
    expect(prisma.profiles.create).toHaveBeenCalledWith({
      data: { id: 'new-uuid', name: '홍길동', generation: 3, role: 'member' },
    });
  });

  it('surfaces supabase user-creation errors as BadRequest', async () => {
    const { svc } = makeService({
      storedCode: 'GOOD-CODE',
      createUserResult: { data: { user: null }, error: { message: 'taken' } },
    });
    await expect(svc.signup(dto)).rejects.toThrow(BadRequestException);
  });

  it('deletes the orphan auth user when profile creation fails', async () => {
    const { svc, supabase } = makeService({
      storedCode: 'GOOD-CODE',
      profileCreateFails: true,
    });
    await expect(svc.signup(dto)).rejects.toThrow('db down');
    expect(supabase.deleteUser).toHaveBeenCalledWith('new-uuid');
  });
});
