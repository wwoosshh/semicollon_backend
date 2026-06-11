import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupabaseAdminService } from '../supabase/supabase-admin.service';

// 확장자는 사용자가 보낸 파일명이 아니라 검증된 mimetype에서 결정한다 (spoofing 방지)
const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const MAX_SIZE = 5 * 1024 * 1024;

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(private readonly supabase: SupabaseAdminService) {}

  async upload(file: Express.Multer.File): Promise<{ url: string }> {
    const ext = EXT_BY_MIME[file.mimetype];
    if (!ext) {
      throw new BadRequestException('이미지 파일만 업로드할 수 있습니다.');
    }
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('파일 크기는 5MB 이하여야 합니다.');
    }
    const path = `${randomUUID()}.${ext}`;
    const { error } = await this.supabase.uploadImage(
      path,
      file.buffer,
      file.mimetype,
    );
    if (error) {
      // 사용자에겐 일반 메시지를 주되, 운영 진단을 위해 원인은 로그로 남긴다
      this.logger.error(`스토리지 업로드 실패: ${error.message}`);
      throw new BadRequestException(
        '업로드에 실패했습니다. 다시 시도해 주세요.',
      );
    }
    return { url: this.supabase.publicImageUrl(path) };
  }
}
