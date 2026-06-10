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

describe('SettingsService', () => {
  it('isRecruiting is false when period is null', async () => {
    const svc = new SettingsService(
      prismaWith({ recruit_period: { start: null, end: null } }),
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
    );
    const r = await svc.getRecruit();
    expect(r.isRecruiting).toBe(false);
  });

  it('getInviteCode returns the stored code', async () => {
    const svc = new SettingsService(prismaWith({ invite_code: 'SECRET99' }));
    await expect(svc.getInviteCode()).resolves.toBe('SECRET99');
  });

  it('getAbout returns empty arrays when keys are missing', async () => {
    const svc = new SettingsService(prismaWith({}));
    const about = await svc.getAbout();
    expect(about).toEqual({ history: [], staff: [], faq: [] });
  });

  it('getAbout returns stored arrays and setAbout calls upsert 3 times', async () => {
    const history = [{ year: '2026.06', title: '동아리 창립' }];
    const staff = [{ name: '홍길동', role: '부장' }];
    const faq = [{ q: '질문', a: '답변' }];
    const prisma = prismaWith({ about_history: history, about_staff: staff, about_faq: faq });
    const svc = new SettingsService(prisma);

    const about = await svc.getAbout();
    expect(about).toEqual({ history, staff, faq });

    await svc.setAbout({ history, staff, faq });
    expect(prisma.settings.upsert).toHaveBeenCalledTimes(3);
  });
});
