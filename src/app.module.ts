import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CacheModule } from './cache/cache.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { SupabaseModule } from './supabase/supabase.module';
import { SignupModule } from './signup/signup.module';
import { MeModule } from './me/me.module';
import { PostsModule } from './posts/posts.module';
import { ActivitiesModule } from './activities/activities.module';
import { ApplicationsModule } from './applications/applications.module';
import { AdminModule } from './admin/admin.module';
import { UploadsModule } from './uploads/uploads.module';
import { EventsModule } from './events/events.module';
import { CommentsModule } from './comments/comments.module';

@Module({
  imports: [
    // 전역 기본 rate limit — 공개 엔드포인트 스팸으로 테이블/커넥션 풀이 포화되는 것 방지
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    CacheModule,
    AuthModule,
    SettingsModule,
    SupabaseModule,
    SignupModule,
    MeModule,
    PostsModule,
    ActivitiesModule,
    ApplicationsModule,
    AdminModule,
    UploadsModule,
    EventsModule,
    CommentsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
