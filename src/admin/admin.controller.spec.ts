import { BadRequestException } from '@nestjs/common';
import { AdminController } from './admin.controller';

function makeController(overrides: {
  applications?: any;
  settings?: any;
  members?: any;
} = {}) {
  const applications = {
    list: jest.fn().mockResolvedValue([]),
    updateStatus: jest.fn().mockResolvedValue({}),
    ...overrides.applications,
  } as any;
  const settings = {
    setRecruit: jest.fn().mockResolvedValue(undefined),
    getRecruit: jest.fn().mockResolvedValue({}),
    ...overrides.settings,
  } as any;
  const members = {
    list: jest.fn().mockResolvedValue([]),
    updateRole: jest.fn().mockResolvedValue({}),
    deleteMember: jest.fn().mockResolvedValue(undefined),
    ...overrides.members,
  } as any;
  return {
    controller: new AdminController(applications, settings, members),
    applications,
    settings,
    members,
  };
}

describe('AdminController', () => {
  it('delegates status updates to the service', async () => {
    const { controller, applications } = makeController();
    await controller.updateStatus(3, { status: 'accepted' });
    expect(applications.updateStatus).toHaveBeenCalledWith(3, 'accepted');
  });

  it('returns updated recruit info after setting period', async () => {
    const { controller, settings } = makeController({
      settings: {
        getRecruit: jest
          .fn()
          .mockResolvedValue({ start: 's', end: 'e', isRecruiting: true }),
      },
    });
    const r = await controller.setRecruit({ start: 's', end: 'e' });
    expect(settings.setRecruit).toHaveBeenCalledWith('s', 'e');
    expect(r.isRecruiting).toBe(true);
  });

  it('rejects a recruit period whose start is after its end', async () => {
    const { controller, settings } = makeController();
    await expect(
      controller.setRecruit({
        start: '2026-07-01T00:00:00Z',
        end: '2026-06-01T00:00:00Z',
      }),
    ).rejects.toThrow(BadRequestException);
    expect(settings.setRecruit).not.toHaveBeenCalled();
  });

  it('delegates role updates with the requester id', async () => {
    const { controller, members } = makeController();
    await controller.updateMemberRole(
      { user: { id: 'admin-1' } },
      'target-1',
      { role: 'admin' },
    );
    expect(members.updateRole).toHaveBeenCalledWith(
      'admin-1',
      'target-1',
      'admin',
    );
  });

  it('delegates member deletion with the requester id', async () => {
    const { controller, members } = makeController();
    const r = await controller.deleteMember(
      { user: { id: 'admin-1' } },
      'target-1',
    );
    expect(members.deleteMember).toHaveBeenCalledWith('admin-1', 'target-1');
    expect(r).toEqual({ ok: true });
  });
});
