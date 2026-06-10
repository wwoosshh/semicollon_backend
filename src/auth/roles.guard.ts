import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    if (!req.user?.id) {
      throw new UnauthorizedException('로그인이 필요합니다.');
    }
    const profile = await this.prisma.profiles.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });
    if (!profile || !required.includes(profile.role)) {
      throw new ForbiddenException('권한이 없습니다.');
    }
    return true;
  }
}
