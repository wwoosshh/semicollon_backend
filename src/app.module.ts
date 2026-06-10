import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health/health.controller';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { SupabaseModule } from './supabase/supabase.module';
import { SignupModule } from './signup/signup.module';
import { MeModule } from './me/me.module';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [PrismaModule, AuthModule, SettingsModule, SupabaseModule, SignupModule, MeModule, PostsModule],
  controllers: [HealthController],
})
export class AppModule {}
