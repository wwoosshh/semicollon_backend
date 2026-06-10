import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

type AuthedRequest = { user: { id: string } };
type MaybeAuthedRequest = { user?: { id: string } };

@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  @UseGuards(OptionalAuthGuard)
  list(@Req() req: MaybeAuthedRequest, @Query('category') category?: string) {
    return this.posts.list(req.user?.id, category);
  }

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  getOne(@Param('id', ParseIntPipe) id: number, @Req() req: MaybeAuthedRequest) {
    return this.posts.getOne(id, req.user?.id);
  }

  @Post()
  @UseGuards(AuthGuard)
  create(@Req() req: AuthedRequest, @Body() dto: CreatePostDto) {
    return this.posts.create(req.user.id, dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthedRequest,
    @Body() dto: UpdatePostDto,
  ) {
    return this.posts.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthedRequest) {
    return this.posts.remove(id, req.user.id);
  }
}
