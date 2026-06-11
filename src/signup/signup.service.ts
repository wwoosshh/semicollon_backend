import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { SupabaseAdminService } from '../supabase/supabase-admin.service';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class SignupService {
  private readonly logger = new Logger(SignupService.name);

  constructor(
    private readonly settings: SettingsService,
    private readonly supabase: SupabaseAdminService,
    private readonly prisma: PrismaService,
  ) {}

  async signup(dto: SignupDto): Promise<{ id: string }> {
    if (!(await this.settings.verifyInviteCode(dto.inviteCode))) {
      throw new BadRequestException('초대 코드가 올바르지 않습니다.');
    }

    const { data, error } = await this.supabase.createUser(
      dto.email,
      dto.password,
    );
    if (error || !data.user) {
      throw new BadRequestException(
        '계정을 만들 수 없습니다. 이미 가입된 이메일인지 확인해 주세요.',
      );
    }

    try {
      await this.prisma.profiles.create({
        data: {
          id: data.user.id,
          name: dto.name,
          generation: dto.generation,
          role: 'member',
        },
      });
    } catch (profileError) {
      // auth 유저는 트랜잭션 롤백이 불가능한 외부 시스템이므로 직접 보상 삭제한다.
      await this.supabase.deleteUser(data.user.id).catch(() => {
        this.logger.error(`고아 auth 유저 삭제 실패: ${data.user.id}`);
      });
      throw profileError;
    }
    return { id: data.user.id };
  }
}
