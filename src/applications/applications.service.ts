import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { CreateApplicationDto } from './dto/create-application.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly settings: SettingsService,
    private readonly prisma: PrismaService,
  ) {}

  async submit(dto: CreateApplicationDto) {
    const { isRecruiting } = await this.settings.getRecruit();
    if (!isRecruiting) {
      throw new BadRequestException('지금은 모집 기간이 아닙니다.');
    }
    return this.prisma.applications.create({
      data: { name: dto.name, contact: dto.contact, answers: dto.answers },
    });
  }

  list(status?: string) {
    return this.prisma.applications.findMany({
      where: status ? { status } : undefined,
      orderBy: { created_at: 'desc' },
    });
  }

  updateStatus(id: number, status: 'pending' | 'accepted' | 'rejected') {
    return this.prisma.applications.update({
      where: { id },
      data: { status },
    });
  }
}
