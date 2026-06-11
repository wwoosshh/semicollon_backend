import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { assertRequiredEnv } from './config/env.validation';

// bigint PK(JSON.stringify 불가) 직렬화 — API 응답에서 number로 변환
// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

async function bootstrap() {
  // env 누락 시 첫 요청이 아니라 부팅에서 즉시 실패 (CORS 전체 허용 폴백 방지)
  assertRequiredEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Railway 프록시 뒤에서 클라이언트 IP를 식별 (rate limit이 프록시 IP로 뭉치지 않도록)
  app.set('trust proxy', 1);
  // 공개 엔드포인트(지원서 등)로 들어오는 과대 JSON 본문 차단 (파일은 multer가 별도 처리)
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: process.env.CORS_ORIGIN!.split(',') });
  // SIGTERM 시 OnModuleDestroy 훅(DB·Redis 연결 정리)이 실행되도록 함
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
