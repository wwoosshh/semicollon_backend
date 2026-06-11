import { Injectable } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

const NULL_SENTINEL = '__null__';

// 초대 코드는 평문 대신 해시로 저장한다 (DB·Redis 유출 시 노출 방지)
const INVITE_HASH_PREFIX = 'sha256:';

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function constantTimeEquals(a: string, b: string): boolean {
  // 같은 해시 함수를 거쳐 길이를 고정하므로 길이 분기로 인한 타이밍 누출이 없다
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export interface RecruitInfo {
  start: string | null;
  end: string | null;
  isRecruiting: boolean;
}

export interface AboutHistoryItem {
  year: string;
  title: string;
}
export interface AboutStaffItem {
  name: string;
  role: string;
  note?: string;
}
export interface AboutFaqItem {
  q: string;
  a: string;
}
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
    const cached = await this.cache.get<T | string>(cacheKey);
    if (cached !== null) {
      return cached === NULL_SENTINEL ? null : (cached as T);
    }

    const row = await this.prisma.settings.findUnique({ where: { key } });
    const value = (row?.value as T) ?? null;
    if (value !== null) {
      await this.cache.set(cacheKey, value, 300);
    } else {
      // 키가 없는 동안 공개 엔드포인트가 매 요청 DB를 치지 않도록 부재도 짧게 캐시
      await this.cache.set(cacheKey, NULL_SENTINEL, 60);
    }
    return value;
  }

  async getRecruit(): Promise<RecruitInfo> {
    const period = await this.getValue<{
      start: string | null;
      end: string | null;
    }>('recruit_period');
    const start = period?.start ?? null;
    const end = period?.end ?? null;
    const now = new Date();
    const isRecruiting =
      !!start && !!end && new Date(start) <= now && now <= new Date(end);
    return { start, end, isRecruiting };
  }

  async verifyInviteCode(code: string): Promise<boolean> {
    const stored = await this.getValue<string>('invite_code');
    if (!stored) return false;
    if (stored.startsWith(INVITE_HASH_PREFIX)) {
      return constantTimeEquals(
        stored.slice(INVITE_HASH_PREFIX.length),
        sha256Hex(code),
      );
    }
    // 해시 도입 이전에 저장된 평문 코드 호환
    return constantTimeEquals(stored, code);
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
    const hashed = `${INVITE_HASH_PREFIX}${sha256Hex(code)}`;
    await this.prisma.settings.upsert({
      where: { key: 'invite_code' },
      update: { value: hashed },
      create: { key: 'invite_code', value: hashed },
    });
    await this.cache.del('setting:invite_code');
  }

  // 캐시 미스인 키만 모아 단일 쿼리로 읽는다 (키당 SELECT 1회 방지)
  private async getValues(
    keys: string[],
  ): Promise<Map<string, unknown | null>> {
    const result = new Map<string, unknown | null>();
    const misses: string[] = [];

    for (const key of keys) {
      const cached = await this.cache.get<unknown>(`setting:${key}`);
      if (cached !== null) {
        result.set(key, cached === NULL_SENTINEL ? null : cached);
      } else {
        misses.push(key);
      }
    }
    if (misses.length === 0) return result;

    const rows = await this.prisma.settings.findMany({
      where: { key: { in: misses } },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    for (const key of misses) {
      const value = byKey.get(key) ?? null;
      result.set(key, value);
      if (value !== null) {
        await this.cache.set(`setting:${key}`, value, 300);
      } else {
        await this.cache.set(`setting:${key}`, NULL_SENTINEL, 60);
      }
    }
    return result;
  }

  async getAbout(): Promise<AboutContent> {
    const values = await this.getValues([
      'about_history',
      'about_staff',
      'about_faq',
    ]);
    return {
      history: (values.get('about_history') as AboutHistoryItem[]) ?? [],
      staff: (values.get('about_staff') as AboutStaffItem[]) ?? [],
      faq: (values.get('about_faq') as AboutFaqItem[]) ?? [],
    };
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
    await this.cache.del(
      'setting:about_history',
      'setting:about_staff',
      'setting:about_faq',
    );
  }
}
