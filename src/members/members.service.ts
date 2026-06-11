import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
      include: { users: true },
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

    const result = await this.prisma.profiles.update({
      where: { id: targetId },
      data: { role },
    });
    await this.profileCache.invalidate(targetId);
    return result;
  }

  async deleteMember(requesterId: string, targetId: string) {
    if (requesterId === targetId) {
      throw new BadRequestException('자기 자신은 삭제할 수 없습니다.');
    }

    const { error } = await this.supabase.deleteUser(targetId);
    if (error) {
      throw new BadRequestException(error.message);
    }
    await this.profileCache.invalidate(targetId);
  }
}
