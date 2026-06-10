import { defineConfig } from 'prisma/config';
import 'dotenv/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // prisma generate는 DB에 접속하지 않으므로, 빌드 환경에 DATABASE_URL이 없어도
    // 실패하지 않도록 플레이스홀더로 대체한다 (db pull 등 실제 접속 명령은 .env 필요)
    url:
      process.env.DATABASE_URL ??
      'postgresql://placeholder:placeholder@localhost:5432/placeholder',
  },
});
