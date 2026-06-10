import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';

@Module({
  imports: [AuthModule],
  providers: [UploadsService],
  controllers: [UploadsController],
})
export class UploadsModule {}
