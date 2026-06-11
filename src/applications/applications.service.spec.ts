import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ApplicationsService } from './applications.service';

describe('ApplicationsService', () => {
  function makeService(isRecruiting: boolean) {
    const settings = {
      getRecruit: jest.fn().mockResolvedValue({ isRecruiting }),
    } as any;
    const prisma = {
      applications: {
        create: jest.fn().mockResolvedValue({ id: 1n }),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
      },
    } as any;
    return { svc: new ApplicationsService(settings, prisma), prisma };
  }

  const dto = {
    name: '지원자',
    contact: '010-0000-0000',
    answers: { q1: 'a' },
  };

  it('rejects submission outside the recruit period', async () => {
    const { svc } = makeService(false);
    await expect(svc.submit(dto as any)).rejects.toThrow(BadRequestException);
  });

  it('accepts submission during the recruit period', async () => {
    const { svc, prisma } = makeService(true);
    await svc.submit(dto);
    expect(prisma.applications.create).toHaveBeenCalledWith({
      data: { name: '지원자', contact: '010-0000-0000', answers: { q1: 'a' } },
    });
  });

  it('updates application status', async () => {
    const { svc, prisma } = makeService(true);
    await svc.updateStatus(1, 'accepted');
    expect(prisma.applications.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'accepted' },
    });
  });

  it('maps P2025 to NotFoundException when updating a missing application', async () => {
    const { svc, prisma } = makeService(true);
    prisma.applications.update.mockRejectedValue(
      Object.assign(new Error('Record not found'), { code: 'P2025' }),
    );
    await expect(svc.updateStatus(999, 'accepted')).rejects.toThrow(
      NotFoundException,
    );
  });
});
