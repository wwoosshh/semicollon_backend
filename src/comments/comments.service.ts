import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostsService } from '../posts/posts.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly postsService: PostsService,
  ) {}

  async listForPost(postId: number, userId: string | undefined) {
    // validates access (member visibility check via PostsService)
    await this.postsService.getOne(postId, userId);

    const rows = await this.prisma.comments.findMany({
      where: { post_id: postId },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        content: true,
        created_at: true,
        author_id: true,
        profiles: { select: { name: true } },
      },
    });
    // author_id가 null이면 탈퇴한 부원 — author: null로 응답
    return rows.map((c) => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      author:
        c.author_id && c.profiles
          ? { id: c.author_id, name: c.profiles.name }
          : null,
    }));
  }

  async create(postId: number, userId: string, dto: CreateCommentDto) {
    // check that requester has a profile (is a member)
    const profile = await this.prisma.profiles.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!profile) {
      throw new ForbiddenException('부원만 댓글을 작성할 수 있습니다.');
    }

    // validate post access
    await this.postsService.getOne(postId, userId);

    return this.prisma.comments.create({
      data: {
        post_id: postId,
        author_id: userId,
        content: dto.content,
      },
    });
  }

  async remove(commentId: number, userId: string) {
    const comment = await this.prisma.comments.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');

    const isAuthor = comment.author_id === userId;
    if (!isAuthor) {
      const profile = await this.prisma.profiles.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (profile?.role !== 'admin') {
        throw new ForbiddenException('본인이 작성한 댓글만 삭제할 수 있습니다.');
      }
    }

    return this.prisma.comments.delete({ where: { id: commentId } });
  }
}
