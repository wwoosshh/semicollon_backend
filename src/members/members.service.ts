import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isRecordNotFoundError } from '../prisma/prisma-errors';
import { SupabaseAdminService } from '../supabase/supabase-admin.service';
import { ProfileCacheService } from '../cache/profile-cache.service';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseAdminService,
    private readonly profileCache: ProfileCacheService,
  ) {}

  async list() {
    const profiles = await this.prisma.profiles.findMany({
      // auth.users 전체(암호 해시 포함)를 메모리에 올리지 않도록 email만 읽는다
      include: { users: { select: { email: true } } },
      orderBy: [{ generation: 'asc' }, { name: 'asc' }],
    });

    return profiles.map((p) => ({
      id: p.id,
      name: p.name,
      generation: p.generation,
      role: p.role,
      created_at: p.created_at,
      email: p.users?.email ?? null,
    }));
  }

  async updateRole(requesterId: string, targetId: string, role: string) {
    if (requesterId === targetId) {
      throw new BadRequestException('자신의 역할은 변경할 수 없습니다.');
    }

    const profile = await this.prisma.profiles.findUnique({
      where: { id: targetId },
    });
    if (!profile) {
      throw new NotFoundException('해당 부원을 찾을 수 없습니다.');
    }
    if (profile.role === 'admin' && role !== 'admin') {
      await this.assertNotLastAdmin('마지막 관리자는 강등할 수 없습니다.');
    }

    try {
      // 업데이트 전에도 무효화 — 직전 조회가 이전 역할을 재캐싱하는 창을 줄인다
      await this.profileCache.invalidate(targetId);
      const result = await this.prisma.profiles.update({
        where: { id: targetId },
        data: { role },
      });
      await this.profileCache.invalidate(targetId);
      return result;
    } catch (e) {
      if (isRecordNotFoundError(e)) {
        throw new NotFoundException('해당 부원을 찾을 수 없습니다.');
      }
      throw e;
    }
  }

  async deleteMember(requesterId: string, targetId: string) {
    if (requesterId === targetId) {
      throw new BadRequestException('자기 자신은 삭제할 수 없습니다.');
    }

    const profile = await this.prisma.profiles.findUnique({
      where: { id: targetId },
    });
    if (profile?.role === 'admin') {
      await this.assertNotLastAdmin('마지막 관리자는 삭제할 수 없습니다.');
    }

    const { error } = await this.supabase.deleteUser(targetId);
    if (error) {
      throw new BadRequestException(error.message);
    }
    await this.profileCache.invalidate(targetId);
  }

  private async assertNotLastAdmin(message: string) {
    const adminCount = await this.prisma.profiles.count({
      where: { role: 'admin' },
    });
    if (adminCount <= 1) {
      throw new BadRequestException(message);
    }
  }
}
