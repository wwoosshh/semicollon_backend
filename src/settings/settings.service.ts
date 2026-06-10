import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RecruitInfo {
  start: string | null;
  end: string | null;
  isRecruiting: boolean;
}

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getValue<T>(key: string): Promise<T | null> {
    const row = await this.prisma.settings.findUnique({ where: { key } });
    return (row?.value as T) ?? null;
  }

  async getRecruit(): Promise<RecruitInfo> {
    const period = await this.getValue<{ start: string | null; end: string | null }>(
      'recruit_period',
    );
    const start = period?.start ?? null;
    const end = period?.end ?? null;
    const now = new Date();
    const isRecruiting =
      !!start && !!end && new Date(start) <= now && now <= new Date(end);
    return { start, end, isRecruiting };
  }

  async getInviteCode(): Promise<string | null> {
    return this.getValue<string>('invite_code');
  }

  async setRecruit(start: string | null, end: string | null): Promise<void> {
    await this.prisma.settings.upsert({
      where: { key: 'recruit_period' },
      update: { value: { start, end } },
      create: { key: 'recruit_period', value: { start, end } },
    });
  }

  async setInviteCode(code: string): Promise<void> {
    await this.prisma.settings.upsert({
      where: { key: 'invite_code' },
      update: { value: code },
      create: { key: 'invite_code', value: code },
    });
  }
}
