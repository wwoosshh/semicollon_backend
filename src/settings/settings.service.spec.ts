import { SettingsService } from './settings.service';

function prismaWith(settings: Record<string, unknown>) {
  return {
    settings: {
      findUnique: jest.fn(({ where: { key } }) =>
        Promise.resolve(key in settings ? { key, value: settings[key] } : null),
      ),
      findMany: jest.fn(({ where: { key: { in: keys } } }) =>
        Promise.resolve(
          (keys as string[])
            .filter((k) => k in settings)
            .map((k) => ({ key: k, value: settings[k] })),
        ),
      ),
      upsert: jest.fn().mockResolvedValue({}),
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

describe('SettingsService', () => {
  it('isRecruiting is false when period is null', async () => {
    const svc = new SettingsService(
      prismaWith({ recruit_period: { start: null, end: null } }),
      mockCache(),
    );
    const r = await svc.getRecruit();
    expect(r.isRecruiting).toBe(false);
  });

  it('isRecruiting is true inside the period', async () => {
    const now = new Date();
    const svc = new SettingsService(
      prismaWith({
        recruit_period: {
          start: new Date(now.getTime() - 86400000).toISOString(),
          end: new Date(now.getTime() + 86400000).toISOString(),
        },
      }),
      mockCache(),
    );
    const r = await svc.getRecruit();
    expect(r.isRecruiting).toBe(true);
  });

  it('isRecruiting is false after the period ends', async () => {
    const now = new Date();
    const svc = new SettingsService(
      prismaWith({
        recruit_period: {
          start: new Date(now.getTime() - 2 * 86400000).toISOString(),
          end: new Date(now.getTime() - 86400000).toISOString(),
        },
      }),
      mockCache(),
    );
    const r = await svc.getRecruit();
    expect(r.isRecruiting).toBe(false);
  });

  it('getInviteCode returns the stored code', async () => {
    const svc = new SettingsService(
      prismaWith({ invite_code: 'SECRET99' }),
      mockCache(),
    );
    await expect(svc.verifyInviteCode('SECRET99')).resolves.toBe(true);
  });

  it('getAbout returns empty arrays when keys are missing', async () => {
    const svc = new SettingsService(prismaWith({}), mockCache());
    const about = await svc.getAbout();
    expect(about).toEqual({ history: [], staff: [], faq: [] });
  });

  it('getAbout returns stored arrays and setAbout calls upsert 3 times', async () => {
    const history = [{ year: '2026.06', title: '동아리 창립' }];
    const staff = [{ name: '홍길동', role: '부장' }];
    const faq = [{ q: '질문', a: '답변' }];
    const prisma = prismaWith({
      about_history: history,
      about_staff: staff,
      about_faq: faq,
    });
    const svc = new SettingsService(prisma, mockCache());

    const about = await svc.getAbout();
    expect(about).toEqual({ history, staff, faq });

    await svc.setAbout({ history, staff, faq });
    expect(prisma.settings.upsert).toHaveBeenCalledTimes(3);
  });

  it('getValue returns cached value without hitting prisma on cache hit', async () => {
    const prisma = prismaWith({ invite_code: 'DB_CODE' });
    const cache = mockCache();
    cache.get.mockResolvedValue('CACHED_CODE');
    const svc = new SettingsService(prisma, cache);

    await expect(svc.verifyInviteCode('CACHED_CODE')).resolves.toBe(true);
    expect(prisma.settings.findUnique).not.toHaveBeenCalled();
  });

  it('caches the absence of a key so repeat misses skip the DB', async () => {
    const prisma = prismaWith({});
    const cache = mockCache();
    const svc = new SettingsService(prisma, cache);

    // 첫 호출: DB 미스 → null 표식이 캐시에 저장되어야 함
    await expect(svc.verifyInviteCode('ANY')).resolves.toBe(false);
    expect(cache.set).toHaveBeenCalled();

    // 두 번째 호출: 캐시에 저장된 표식이 돌아오면 DB를 다시 조회하지 않아야 함
    const sentinel = cache.set.mock.calls[0][1];
    cache.get.mockResolvedValue(sentinel);
    await expect(svc.verifyInviteCode('ANY')).resolves.toBe(false);
    expect(prisma.settings.findUnique).toHaveBeenCalledTimes(1);
  });

  it('setInviteCode calls cache.del after upsert', async () => {
    const prisma = prismaWith({});
    const cache = mockCache();
    const svc = new SettingsService(prisma, cache);

    await svc.setInviteCode('NEW_CODE');
    expect(prisma.settings.upsert).toHaveBeenCalled();
    expect(cache.del).toHaveBeenCalledWith('setting:invite_code');
  });

  it('getAbout batches cache misses into a single findMany', async () => {
    const prisma = prismaWith({
      about_history: [{ year: '2026', title: '창립' }],
    });
    const svc = new SettingsService(prisma, mockCache());

    const about = await svc.getAbout();

    expect(about.history).toEqual([{ year: '2026', title: '창립' }]);
    expect(about.staff).toEqual([]);
    expect(prisma.settings.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.settings.findUnique).not.toHaveBeenCalled();
  });

  it('setInviteCode stores a hash, not the plaintext code', async () => {
    const prisma = prismaWith({});
    const svc = new SettingsService(prisma, mockCache());

    await svc.setInviteCode('SECRET99');

    const upsertArg = prisma.settings.upsert.mock.calls[0][0];
    expect(upsertArg.create.value).not.toBe('SECRET99');
    expect(String(upsertArg.create.value)).toMatch(/^sha256:/);
  });

  it('verifyInviteCode matches against the stored hash', async () => {
    const prisma = prismaWith({});
    const cache = mockCache();
    const svc = new SettingsService(prisma, cache);

    await svc.setInviteCode('SECRET99');
    const stored = prisma.settings.upsert.mock.calls[0][0].create.value;
    prisma.settings.findUnique.mockResolvedValue({
      key: 'invite_code',
      value: stored,
    });

    await expect(svc.verifyInviteCode('SECRET99')).resolves.toBe(true);
    await expect(svc.verifyInviteCode('WRONG')).resolves.toBe(false);
  });

  it('verifyInviteCode still accepts a legacy plaintext stored code', async () => {
    const svc = new SettingsService(
      prismaWith({ invite_code: 'LEGACY-PLAIN' }),
      mockCache(),
    );
    await expect(svc.verifyInviteCode('LEGACY-PLAIN')).resolves.toBe(true);
    await expect(svc.verifyInviteCode('WRONG')).resolves.toBe(false);
  });

  it('verifyInviteCode is false when no code is configured', async () => {
    const svc = new SettingsService(prismaWith({}), mockCache());
    await expect(svc.verifyInviteCode('ANY')).resolves.toBe(false);
  });
});
