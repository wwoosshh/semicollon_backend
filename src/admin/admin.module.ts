import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ApplicationsModule } from '../applications/applications.module';
import { SettingsModule } from '../settings/settings.module';
import { MembersModule } from '../members/members.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [AuthModule, ApplicationsModule, SettingsModule, MembersModule],
  controllers: [AdminController],
})
export class AdminModule {}
