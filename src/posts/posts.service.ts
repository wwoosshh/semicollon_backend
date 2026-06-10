import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  private async isAdmin(userId: string): Promise<boolean> {
    const profile = await this.prisma.profiles.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return profile?.role === 'admin';
  }

  list(userId: string | undefined, category: string | undefined) {
    return this.prisma.posts.findMany({
      where: {
        ...(userId ? {} : { visibility: 'public' }),
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
    if (!post || (post.visibility === 'member' && !userId)) {
      throw new NotFoundException('게시글을 찾을 수 없습니다.');
    }
    return post;
  }

  async create(userId: string, dto: CreatePostDto) {
    if (dto.category === 'notice' && !(await this.isAdmin(userId))) {
      throw new ForbiddenException('공지는 운영진만 작성할 수 있습니다.');
    }
    return this.prisma.posts.create({
      data: {
        title: dto.title,
        content: dto.content,
        category: dto.category,
        visibility: dto.visibility,
        image_urls: dto.imageUrls ?? [],
        author_id: userId,
      },
    });
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
    return this.prisma.posts.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.visibility !== undefined ? { visibility: dto.visibility } : {}),
        ...(dto.imageUrls !== undefined ? { image_urls: dto.imageUrls } : {}),
      },
    });
  }

  async remove(id: number, userId: string) {
    await this.assertCanEdit(id, userId);
    return this.prisma.posts.delete({ where: { id } });
  }
}
