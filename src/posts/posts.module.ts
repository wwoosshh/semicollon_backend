import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';

@Module({
  imports: [AuthModule],
  providers: [PostsService],
  controllers: [PostsController],
})
export class PostsModule {}
