import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
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
  imports: [PrismaModule, AuthModule, SettingsModule, SupabaseModule, SignupModule, MeModule, PostsModule, ActivitiesModule, ApplicationsModule, AdminModule, UploadsModule, EventsModule, CommentsModule],
  controllers: [HealthController],
})
export class AppModule {}
