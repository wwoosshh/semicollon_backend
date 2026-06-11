import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

const ACTIVITY_CACHE_KEYS = [
  'activities:all',
  'activities:project',
  'activities:study',
  'activities:event',
];

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async list(type?: string) {
    const cacheKey = `activities:${type ?? 'all'}`;
    const cached = await this.cache.get<any[]>(cacheKey);
    if (cached !== null) return cached;

    const result = await this.prisma.activities.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ year: 'desc' }, { created_at: 'desc' }],
    });
    await this.cache.set(cacheKey, result, 30);
    return result;
  }

  async getOne(id: number) {
    const activity = await this.prisma.activities.findUnique({ where: { id } });
    if (!activity) throw new NotFoundException('활동을 찾을 수 없습니다.');
    return activity;
  }

  async create(dto: CreateActivityDto) {
    const result = await this.prisma.activities.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        year: dto.year,
        thumbnail_url: dto.thumbnailUrl ?? null,
        tags: dto.tags ?? [],
        image_urls: dto.imageUrls ?? [],
      },
    });
    await this.cache.del(...ACTIVITY_CACHE_KEYS);
    return result;
  }

  async update(id: number, dto: UpdateActivityDto) {
    await this.getOne(id);
    const result = await this.prisma.activities.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.year !== undefined ? { year: dto.year } : {}),
        ...(dto.thumbnailUrl !== undefined ? { thumbnail_url: dto.thumbnailUrl } : {}),
        ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
        ...(dto.imageUrls !== undefined ? { image_urls: dto.imageUrls } : {}),
      },
    });
    await this.cache.del(...ACTIVITY_CACHE_KEYS);
    return result;
  }

  async remove(id: number) {
    await this.getOne(id);
    const result = await this.prisma.activities.delete({ where: { id } });
    await this.cache.del(...ACTIVITY_CACHE_KEYS);
    return result;
  }
}
