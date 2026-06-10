import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostsService } from './posts.service';

function makePrisma(overrides: any = {}) {
  return {
    posts: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      ...overrides.posts,
    },
    profiles: {
      findUnique: jest.fn().mockResolvedValue({ role: 'member' }),
      ...overrides.profiles,
    },
  } as any;
}

describe('PostsService', () => {
  it('lists only public posts for anonymous users', async () => {
    const prisma = makePrisma();
    const svc = new PostsService(prisma);
    await svc.list(undefined, undefined);
    expect(prisma.posts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ visibility: 'public' }),
      }),
    );
  });

  it('lists public and member posts for members', async () => {
    const prisma = makePrisma();
    const svc = new PostsService(prisma);
    await svc.list('u1', undefined);
    expect(prisma.posts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ visibility: 'public' }),
      }),
    );
  });

  it('hides member-only post detail from anonymous users', async () => {
    const prisma = makePrisma({
      posts: {
        findUnique: jest.fn().mockResolvedValue({ id: 1n, visibility: 'member' }),
      },
    });
    const svc = new PostsService(prisma);
    await expect(svc.getOne(1, undefined)).rejects.toThrow(NotFoundException);
  });

  it('rejects notice creation by a non-admin', async () => {
    const prisma = makePrisma();
    const svc = new PostsService(prisma);
    await expect(
      svc.create('u1', { title: 't', content: 'c', category: 'notice', visibility: 'public' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows blog creation by a member', async () => {
    const prisma = makePrisma();
    const svc = new PostsService(prisma);
    await svc.create('u1', { title: 't', content: 'c', category: 'blog', visibility: 'public' } as any);
    expect(prisma.posts.create).toHaveBeenCalled();
  });

  it("rejects updating someone else's post when not admin", async () => {
    const prisma = makePrisma({
      posts: {
        findUnique: jest.fn().mockResolvedValue({ id: 1n, author_id: 'other' }),
      },
    });
    const svc = new PostsService(prisma);
    await expect(svc.update(1, 'u1', { title: 'x' } as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows admin to delete any post', async () => {
    const prisma = makePrisma({
      posts: {
        findUnique: jest.fn().mockResolvedValue({ id: 1n, author_id: 'other' }),
      },
      profiles: { findUnique: jest.fn().mockResolvedValue({ role: 'admin' }) },
    });
    const svc = new PostsService(prisma);
    await svc.remove(1, 'admin-user');
    expect(prisma.posts.delete).toHaveBeenCalled();
  });
});
