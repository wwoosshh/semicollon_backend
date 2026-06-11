import { BadRequestException, Logger } from '@nestjs/common';
import { UploadsService } from './uploads.service';

describe('UploadsService', () => {
  function makeService(uploadError: unknown = null) {
    const supabase = {
      uploadImage: jest.fn().mockResolvedValue({ error: uploadError }),
      publicImageUrl: jest.fn().mockReturnValue('https://cdn/x.png'),
    } as any;
    return { svc: new UploadsService(supabase), supabase };
  }

  const file = {
    originalname: 'photo.png',
    mimetype: 'image/png',
    size: 1024,
    buffer: Buffer.from('x'),
  } as Express.Multer.File;

  it('rejects non-image mime types', async () => {
    const { svc } = makeService();
    await expect(
      svc.upload({ ...file, mimetype: 'application/pdf' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects files over 5MB', async () => {
    const { svc } = makeService();
    await expect(
      svc.upload({ ...file, size: 6 * 1024 * 1024 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('uploads and returns a public url', async () => {
    const { svc, supabase } = makeService();
    const r = await svc.upload(file);
    expect(supabase.uploadImage).toHaveBeenCalled();
    expect(r.url).toBe('https://cdn/x.png');
  });

  it('surfaces storage errors', async () => {
    const { svc } = makeService({ message: 'boom' });
    await expect(svc.upload(file)).rejects.toThrow(BadRequestException);
  });

  it('logs the underlying storage error for diagnostics', async () => {
    const errSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    const { svc } = makeService({ message: 'boom' });

    await expect(svc.upload(file)).rejects.toThrow(BadRequestException);
    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('boom'));
    errSpy.mockRestore();
  });
});
