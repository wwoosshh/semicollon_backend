import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

// Railway 헬스체크가 rate limit에 걸리면 정상 인스턴스가 비정상으로 보인다
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    // DB가 죽었는데 200을 돌려주면 Railway가 정상으로 판단해 재시작하지 않는다
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException(
        '데이터베이스에 연결할 수 없습니다.',
      );
    }
    return { status: 'ok' };
  }
}
