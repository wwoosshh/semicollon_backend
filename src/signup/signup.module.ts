import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { SignupService } from './signup.service';
import { SignupController } from './signup.controller';

@Module({
  imports: [SettingsModule, SupabaseModule],
  providers: [SignupService],
  controllers: [SignupController],
})
export class SignupModule {}
