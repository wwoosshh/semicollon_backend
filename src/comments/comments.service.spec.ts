import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CommentsService } from './comments.service';

function makePrisma(overrides: any = {}) {
  return {
    comments: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 1n }),
      delete: jest.fn().mockResolvedValue({}),
      ...overrides.comments,
    },
    profiles: {
      findUnique: jest.fn().mockResolvedValue({ id: 'u1', role: 'member' }),
      ...overrides.profiles,
    },
    posts: {
      findUnique: jest.fn().mockResolvedValue({
        id: 1n,
        visibility: 'member',
        profiles: { name: 'Author' },
      }),
      ...overrides.posts,
    },
  } as any;
}

// Stub PostsService so CommentsService can call getOne
function makePostsService(postResult?: any, throws?: any) {
  return {
    getOne: throws
      ? jest.fn().mockRejectedValue(throws)
      : jest.fn().mockResolvedValue(
          postResult ?? { id: 1n, visibility: 'public' },
        ),
  } as any;
}

function mockProfileCache(role: 'admin' | 'member' | null = 'member') {
  return {
    getRole: jest.fn().mockResolvedValue(role),
    invalidate: jest.fn().mockResolvedValue(undefined),
  } as any;
}

describe('CommentsService', () => {
  it('blocks non-member from listing comments on a member-only post', async () => {
    const prisma = makePrisma();
    const postsService = makePostsService(
      null,
      new NotFoundException('게시글을 찾을 수 없습니다.'),
    );
    const svc = new CommentsService(prisma, postsService, mockProfileCache(null));
    await expect(svc.listForPost(1, undefined)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('maps authors to { id, name } and deleted authors to null', async () => {
    const prisma = makePrisma({
      comments: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1n,
            content: 'hi',
            created_at: new Date('2026-06-10'),
            author_id: 'u1',
            profiles: { name: '홍길동' },
          },
          {
            id: 2n,
            content: 'bye',
            created_at: new Date('2026-06-11'),
            author_id: null,
            profiles: null,
          },
        ]),
      },
    });
    const postsService = makePostsService({ id: 1n, visibility: 'public' });
    const svc = new CommentsService(prisma, postsService, mockProfileCache('member'));
    const result = await svc.listForPost(1, undefined);
    expect(result[0].author).toEqual({ id: 'u1', name: '홍길동' });
    expect(result[1].author).toBeNull();
  });

  it('creates a comment for a member on a valid post', async () => {
    const prisma = makePrisma();
    const postsService = makePostsService({ id: 1n, visibility: 'public' });
    const svc = new CommentsService(prisma, postsService, mockProfileCache('member'));
    await svc.create(1, 'u1', { content: 'Hello!' });
    expect(prisma.comments.create).toHaveBeenCalled();
  });

  it('returns 403 when creating a comment without a profile (non-member)', async () => {
    const prisma = makePrisma({
      profiles: { findUnique: jest.fn().mockResolvedValue(null) },
    });
    const postsService = makePostsService({ id: 1n, visibility: 'public' });
    const svc = new CommentsService(prisma, postsService, mockProfileCache(null));
    await expect(svc.create(1, 'ghost', { content: 'Hi' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows author to delete their own comment', async () => {
    const prisma = makePrisma({
      comments: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 1n, author_id: 'u1', post_id: 10n }),
        delete: jest.fn().mockResolvedValue({}),
      },
      profiles: {
        findUnique: jest.fn().mockResolvedValue({ role: 'member' }),
      },
    });
    const postsService = makePostsService();
    const svc = new CommentsService(prisma, postsService, mockProfileCache('member'));
    await svc.remove(1, 'u1');
    expect(prisma.comments.delete).toHaveBeenCalled();
  });

  it('returns 403 when a non-admin tries to delete another user comment', async () => {
    const prisma = makePrisma({
      comments: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 1n, author_id: 'other', post_id: 10n }),
        delete: jest.fn().mockResolvedValue({}),
      },
      profiles: {
        findUnique: jest.fn().mockResolvedValue({ role: 'member' }),
      },
    });
    const postsService = makePostsService();
    const svc = new CommentsService(prisma, postsService, mockProfileCache('member'));
    await expect(svc.remove(1, 'u1')).rejects.toThrow(ForbiddenException);
  });
});
