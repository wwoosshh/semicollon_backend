import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

export interface RecruitInfo {
  start: string | null;
  end: string | null;
  isRecruiting: boolean;
}

export interface AboutHistoryItem { year: string; title: string; }
export interface AboutStaffItem { name: string; role: string; note?: string; }
export interface AboutFaqItem { q: string; a: string; }
export interface AboutContent {
  history: AboutHistoryItem[];
  staff: AboutStaffItem[];
  faq: AboutFaqItem[];
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  private async getValue<T>(key: string): Promise<T | null> {
    const cacheKey = `setting:${key}`;
    const cached = await this.cache.get<T>(cacheKey);
    if (cached !== null) return cached;

    const row = await this.prisma.settings.findUnique({ where: { key } });
    const value = (row?.value as T) ?? null;
    if (value !== null) {
      await this.cache.set(cacheKey, value, 300);
    }
    return value;
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
    await this.cache.del('setting:recruit_period');
  }

  async setInviteCode(code: string): Promise<void> {
    await this.prisma.settings.upsert({
      where: { key: 'invite_code' },
      update: { value: code },
      create: { key: 'invite_code', value: code },
    });
    await this.cache.del('setting:invite_code');
  }

  async getAbout(): Promise<AboutContent> {
    const [history, staff, faq] = await Promise.all([
      this.getValue<AboutHistoryItem[]>('about_history'),
      this.getValue<AboutStaffItem[]>('about_staff'),
      this.getValue<AboutFaqItem[]>('about_faq'),
    ]);
    return { history: history ?? [], staff: staff ?? [], faq: faq ?? [] };
  }

  async setAbout(content: AboutContent): Promise<void> {
    await Promise.all([
      this.prisma.settings.upsert({
        where: { key: 'about_history' },
        update: { value: content.history as any },
        create: { key: 'about_history', value: content.history as any },
      }),
      this.prisma.settings.upsert({
        where: { key: 'about_staff' },
        update: { value: content.staff as any },
        create: { key: 'about_staff', value: content.staff as any },
      }),
      this.prisma.settings.upsert({
        where: { key: 'about_faq' },
        update: { value: content.faq as any },
        create: { key: 'about_faq', value: content.faq as any },
      }),
    ]);
    await this.cache.del('setting:about_history', 'setting:about_staff', 'setting:about_faq');
  }
}
