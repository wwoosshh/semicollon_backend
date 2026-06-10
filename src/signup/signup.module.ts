import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { SignupService } from './signup.service';
import { SignupController } from './signup.controller';

@Module({
  imports: [SettingsModule],
  providers: [SignupService],
  controllers: [SignupController],
})
export class SignupModule {}
