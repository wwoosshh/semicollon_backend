import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

type AuthedRequest = { user: { id: string } };
type MaybeAuthedRequest = { user?: { id: string } };

@Controller('posts/:postId/comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  list(
    @Param('postId', ParseIntPipe) postId: number,
    @Req() req: MaybeAuthedRequest,
  ) {
    return this.comments.listForPost(postId, req.user?.id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Param('postId', ParseIntPipe) postId: number,
    @Req() req: AuthedRequest,
    @Body() dto: CreateCommentDto,
  ) {
    return this.comments.create(postId, req.user.id, dto);
  }
}

@Controller('comments')
export class CommentsDeleteController {
  constructor(private readonly comments: CommentsService) {}

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthedRequest,
  ) {
    return this.comments.remove(id, req.user.id);
  }
}
