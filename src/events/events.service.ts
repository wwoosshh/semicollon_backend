import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  list(from?: string, to?: string) {
    const startsAtFilter: Record<string, Date> = {};
    if (from) startsAtFilter.gte = new Date(from);
    if (to) startsAtFilter.lte = new Date(to);

    return this.prisma.events.findMany({
      where:
        Object.keys(startsAtFilter).length > 0
          ? { starts_at: startsAtFilter }
          : undefined,
      orderBy: { starts_at: 'asc' },
    });
  }

  async create(dto: CreateEventDto) {
    if (dto.endsAt && dto.startsAt) {
      if (new Date(dto.endsAt) < new Date(dto.startsAt)) {
        throw new BadRequestException(
          '종료 시간은 시작 시간보다 늦어야 합니다.',
        );
      }
    }
    return this.prisma.events.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        location: dto.location ?? null,
        starts_at: new Date(dto.startsAt),
        ends_at: dto.endsAt ? new Date(dto.endsAt) : null,
      },
    });
  }

  async update(id: number, dto: UpdateEventDto) {
    await this.getOne(id);
    if (dto.endsAt && dto.startsAt) {
      if (new Date(dto.endsAt) < new Date(dto.startsAt)) {
        throw new BadRequestException(
          '종료 시간은 시작 시간보다 늦어야 합니다.',
        );
      }
    }
    return this.prisma.events.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.location !== undefined ? { location: dto.location } : {}),
        ...(dto.startsAt !== undefined
          ? { starts_at: new Date(dto.startsAt) }
          : {}),
        ...(dto.endsAt !== undefined ? { ends_at: new Date(dto.endsAt) } : {}),
      },
    });
  }

  async remove(id: number) {
    await this.getOne(id);
    return this.prisma.events.delete({ where: { id } });
  }

  private async getOne(id: number) {
    const event = await this.prisma.events.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('일정을 찾을 수 없습니다.');
    return event;
  }
}
