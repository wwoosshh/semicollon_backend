import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PostsModule } from '../posts/posts.module';
import { CommentsService } from './comments.service';
import {
  CommentsController,
  CommentsDeleteController,
} from './comments.controller';

@Module({
  imports: [AuthModule, PostsModule],
  providers: [CommentsService],
  controllers: [CommentsController, CommentsDeleteController],
})
export class CommentsModule {}
