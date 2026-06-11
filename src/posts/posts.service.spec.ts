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

function mockCache() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  } as any;
}

function mockProfileCache(role: 'admin' | 'member' | null = 'member') {
  return {
    getRole: jest.fn().mockResolvedValue(role),
    invalidate: jest.fn().mockResolvedValue(undefined),
  } as any;
}

describe('PostsService', () => {
  it('lists only public posts for anonymous users', async () => {
    const prisma = makePrisma();
    const svc = new PostsService(prisma, mockCache(), mockProfileCache(null));
    await svc.list(undefined, undefined);
    expect(prisma.posts.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ visibility: 'public' }),
      }),
    );
  });

  it('lists public and member posts for members', async () => {
    const prisma = makePrisma();
    const svc = new PostsService(prisma, mockCache(), mockProfileCache('member'));
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
    const svc = new PostsService(prisma, mockCache(), mockProfileCache(null));
    await expect(svc.getOne(1, undefined)).rejects.toThrow(NotFoundException);
  });

  it('hides member posts from a valid token without a profile', async () => {
    const prisma = makePrisma({
      posts: {
        findUnique: jest.fn().mockResolvedValue({ id: 1n, visibility: 'member' }),
      },
      profiles: { findUnique: jest.fn().mockResolvedValue(null) },
    });
    const svc = new PostsService(prisma, mockCache(), mockProfileCache(null));
    await expect(svc.getOne(1, 'ghost-token-user')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('rejects notice creation by a non-admin', async () => {
    const prisma = makePrisma();
    const svc = new PostsService(prisma, mockCache(), mockProfileCache('member'));
    await expect(
      svc.create('u1', { title: 't', content: 'c', category: 'notice', visibility: 'public' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows blog creation by a member', async () => {
    const prisma = makePrisma();
    const svc = new PostsService(prisma, mockCache(), mockProfileCache('member'));
    await svc.create('u1', { title: 't', content: 'c', category: 'blog', visibility: 'public' } as any);
    expect(prisma.posts.create).toHaveBeenCalled();
  });

  it("rejects updating someone else's post when not admin", async () => {
    const prisma = makePrisma({
      posts: {
        findUnique: jest.fn().mockResolvedValue({ id: 1n, author_id: 'other' }),
      },
    });
    const svc = new PostsService(prisma, mockCache(), mockProfileCache('member'));
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
    const svc = new PostsService(prisma, mockCache(), mockProfileCache('admin'));
    await svc.remove(1, 'admin-user');
    expect(prisma.posts.delete).toHaveBeenCalled();
  });

  it('returns cached public list without hitting prisma on cache hit', async () => {
    const prisma = makePrisma();
    const cache = mockCache();
    const cachedPosts = [{ id: 1, title: 'cached post' }];
    cache.get.mockResolvedValue(cachedPosts);
    const svc = new PostsService(prisma, cache, mockProfileCache(null));

    const result = await svc.list(undefined, undefined);
    expect(result).toBe(cachedPosts);
    expect(prisma.posts.findMany).not.toHaveBeenCalled();
  });

  it('invalidates public cache keys after create', async () => {
    const prisma = makePrisma();
    const cache = mockCache();
    const svc = new PostsService(prisma, cache, mockProfileCache('member'));

    await svc.create('u1', { title: 't', content: 'c', category: 'blog', visibility: 'public' } as any);
    expect(cache.del).toHaveBeenCalledWith(
      'posts:public:all',
      'posts:public:notice',
      'posts:public:blog',
    );
  });
});
