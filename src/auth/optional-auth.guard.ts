import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtVerifier } from './jwt.verifier';

@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly verifier: JwtVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    if (header?.startsWith('Bearer ')) {
      try {
        const payload = await this.verifier.verify(header.slice(7));
        req.user = { id: payload.sub };
      } catch {
        // 유효하지 않은 토큰은 비로그인으로 취급
      }
    }
    return true;
  }
}
