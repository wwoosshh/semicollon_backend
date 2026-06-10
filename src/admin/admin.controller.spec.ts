import { AdminController } from './admin.controller';

describe('AdminController', () => {
  it('delegates status updates to the service', async () => {
    const applications = {
      list: jest.fn().mockResolvedValue([]),
      updateStatus: jest.fn().mockResolvedValue({}),
    } as any;
    const settings = {} as any;
    const controller = new AdminController(applications, settings);
    await controller.updateStatus(3, { status: 'accepted' });
    expect(applications.updateStatus).toHaveBeenCalledWith(3, 'accepted');
  });

  it('returns updated recruit info after setting period', async () => {
    const applications = {} as any;
    const settings = {
      setRecruit: jest.fn().mockResolvedValue(undefined),
      getRecruit: jest
        .fn()
        .mockResolvedValue({ start: 's', end: 'e', isRecruiting: true }),
    } as any;
    const controller = new AdminController(applications, settings);
    const r = await controller.setRecruit({ start: 's', end: 'e' });
    expect(settings.setRecruit).toHaveBeenCalledWith('s', 'e');
    expect(r.isRecruiting).toBe(true);
  });
});
