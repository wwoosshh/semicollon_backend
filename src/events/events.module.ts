import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';

@Module({
  imports: [AuthModule],
  providers: [EventsService],
  controllers: [EventsController],
})
export class EventsModule {}
