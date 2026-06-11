import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from './cache.service';

const NULL_SENTINEL = '__null__';

@Injectable()
export class ProfileCacheService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async getRole(userId: string): Promise<'admin' | 'member' | null> {
    const key = `profile-role:${userId}`;
    const cached = await this.cache.get<string>(key);
    if (cached !== null) {
      return cached === NULL_SENTINEL ? null : (cached as 'admin' | 'member');
    }

    const profile = await this.prisma.profiles.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!profile) {
      await this.cache.set(key, NULL_SENTINEL, 15);
      return null;
    }

    await this.cache.set(key, profile.role, 60);
    return profile.role as 'admin' | 'member';
  }

  async invalidate(userId: string): Promise<void> {
    await this.cache.del(`profile-role:${userId}`);
  }
}
