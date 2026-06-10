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
});
