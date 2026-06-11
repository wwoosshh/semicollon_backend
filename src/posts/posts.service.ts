import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { ProfileCacheService } from '../cache/profile-cache.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

const LIST_SELECT = {
  id: true,
  title: true,
  category: true,
  visibility: true,
  created_at: true,
  profiles: { select: { name: true } },
} as const;

const PUBLIC_CACHE_KEYS = ['posts:public:all', 'posts:public:notice', 'posts:public:blog'];

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly profileCache: ProfileCacheService,
  ) {}

  private async isAdmin(userId: string): Promise<boolean> {
    const role = await this.profileCache.getRole(userId);
    return role === 'admin';
  }

  // member 글의 권한 경계는 "유효한 토큰"이 아니라 "profiles 행이 있는 실제 부원"이다
  private async isMember(userId: string | undefined): Promise<boolean> {
    if (!userId) return false;
    const role = await this.profileCache.getRole(userId);
    return role !== null;
  }

  async list(userId: string | undefined, category: string | undefined) {
    const member = await this.isMember(userId);

    // Cache only for anonymous (public) requests
    if (!userId) {
      const cacheKey = `posts:public:${category ?? 'all'}`;
      const cached = await this.cache.get<any[]>(cacheKey);
      if (cached !== null) return cached;

      const result = await this.prisma.posts.findMany({
        where: {
          visibility: 'public',
          ...(category ? { category } : {}),
        },
        orderBy: { created_at: 'desc' },
        select: LIST_SELECT,
      });
      await this.cache.set(cacheKey, result, 30);
      return result;
    }

    return this.prisma.posts.findMany({
      where: {
        ...(member ? {} : { visibility: 'public' }),
        ...(category ? { category } : {}),
      },
      orderBy: { created_at: 'desc' },
      select: LIST_SELECT,
    });
  }

  async getOne(id: number, userId: string | undefined) {
    const post = await this.prisma.posts.findUnique({
      where: { id },
      include: { profiles: { select: { name: true } } },
    });
    if (
      !post ||
      (post.visibility === 'member' && !(await this.isMember(userId)))
    ) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
    return post;
  }

  async create(userId: string, dto: CreatePostDto) {
    if (dto.category === 'notice' && !(await this.isAdmin(userId))) {
      throw new ForbiddenException('공지는 운영진만 작성할 수 있습니다.');
    }
    const result = await this.prisma.posts.create({
      data: {
        title: dto.title,
        content: dto.content,
        category: dto.category,
        visibility: dto.visibility,
        image_urls: dto.imageUrls ?? [],
        author_id: userId,
      },
    });
    await this.cache.del(...PUBLIC_CACHE_KEYS);
    return result;
  }

  private async assertCanEdit(id: number, userId: string) {
    const post = await this.prisma.posts.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    if (post.author_id !== userId && !(await this.isAdmin(userId))) {
      throw new ForbiddenException('본인이 작성한 글만 수정할 수 있습니다.');
    }
  }

  async update(id: number, userId: string, dto: UpdatePostDto) {
    await this.assertCanEdit(id, userId);
    const result = await this.prisma.posts.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.visibility !== undefined ? { visibility: dto.visibility } : {}),
        ...(dto.imageUrls !== undefined ? { image_urls: dto.imageUrls } : {}),
      },
    });
    await this.cache.del(...PUBLIC_CACHE_KEYS);
    return result;
  }

  async remove(id: number, userId: string) {
    await this.assertCanEdit(id, userId);
    const result = await this.prisma.posts.delete({ where: { id } });
    await this.cache.del(...PUBLIC_CACHE_KEYS);
    return result;
  }
}
