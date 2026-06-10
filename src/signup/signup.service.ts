import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { SupabaseAdminService } from '../supabase/supabase-admin.service';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class SignupService {
  constructor(
    private readonly settings: SettingsService,
    private readonly supabase: SupabaseAdminService,
    private readonly prisma: PrismaService,
  ) {}

  async signup(dto: SignupDto): Promise<{ id: string }> {
    const code = await this.settings.getInviteCode();
    if (!code || dto.inviteCode !== code) {
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

    await this.prisma.profiles.create({
      data: {
        id: data.user.id,
        name: dto.name,
        generation: dto.generation,
        role: 'member',
      },
    });
    return { id: data.user.id };
  }
}
