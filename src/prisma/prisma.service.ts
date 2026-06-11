import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      // Supabase 세션 풀러는 연결 한도를 공유하므로 인스턴스당 상한을 명시
      max: Number(process.env.DB_POOL_MAX ?? 5),
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  // 재배포 SIGTERM 시 연결 정리 — main.ts의 enableShutdownHooks()가 있어야 호출됨
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
