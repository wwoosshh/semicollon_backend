import {
  Controller,
  Get,
  NotFoundException,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async me(@Req() req: { user: { id: string } }) {
    const profile = await this.prisma.profiles.findUnique({
      where: { id: req.user.id },
      select: { id: true, name: true, generation: true, role: true },
    });
    if (!profile) {
      throw new NotFoundException('프로필을 찾을 수 없습니다.');
    }
    return profile;
  }
}
