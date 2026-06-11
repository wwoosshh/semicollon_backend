import { SettingsService } from './settings.service';

function prismaWith(settings: Record<string, unknown>) {
  return {
    settings: {
      findUnique: jest.fn(({ where: { key } }) =>
        Promise.resolve(
          key in settings ? { key, value: settings[key] } : null,
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
    const svc = new SettingsService(prismaWith({ invite_code: 'SECRET99' }), mockCache());
    await expect(svc.getInviteCode()).resolves.toBe('SECRET99');
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
    const prisma = prismaWith({ about_history: history, about_staff: staff, about_faq: faq });
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

    const result = await svc.getInviteCode();
    expect(result).toBe('CACHED_CODE');
    expect(prisma.settings.findUnique).not.toHaveBeenCalled();
  });

  it('setInviteCode calls cache.del after upsert', async () => {
    const prisma = prismaWith({});
    const cache = mockCache();
    const svc = new SettingsService(prisma, cache);

    await svc.setInviteCode('NEW_CODE');
    expect(prisma.settings.upsert).toHaveBeenCalled();
    expect(cache.del).toHaveBeenCalledWith('setting:invite_code');
  });
});
