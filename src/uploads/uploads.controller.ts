import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { UploadsService } from './uploads.service';

@Controller('uploads')
@UseGuards(AuthGuard)
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post()
  // multer 레벨 제한은 스트리밍 단계에서 초과 즉시 차단한다 —
  // 서비스의 5MB 검사만으로는 파일 전체가 먼저 메모리에 적재됨 (OOM 위험)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('파일을 첨부해 주세요.');
    }
    return this.uploads.upload(file);
  }
}
