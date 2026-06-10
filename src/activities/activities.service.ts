import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  list(type?: string) {
    return this.prisma.activities.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ year: 'desc' }, { created_at: 'desc' }],
    });
  }

  async getOne(id: number) {
    const activity = await this.prisma.activities.findUnique({ where: { id } });
    if (!activity) throw new NotFoundException('활동을 찾을 수 없습니다.');
    return activity;
  }

  create(dto: CreateActivityDto) {
    return this.prisma.activities.create({
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        year: dto.year,
        thumbnail_url: dto.thumbnailUrl ?? null,
        tags: dto.tags ?? [],
      },
    });
  }

  async update(id: number, dto: UpdateActivityDto) {
    await this.getOne(id);
    return this.prisma.activities.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.year !== undefined ? { year: dto.year } : {}),
        ...(dto.thumbnailUrl !== undefined ? { thumbnail_url: dto.thumbnailUrl } : {}),
        ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
      },
    });
  }

  async remove(id: number) {
    await this.getOne(id);
    return this.prisma.activities.delete({ where: { id } });
  }
}
