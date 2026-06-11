import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  // 인증 없는 공개 제출 — 전역 기본보다 엄격한 IP당 1분 5회 제한
  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  submit(@Body() dto: CreateApplicationDto) {
    return this.applications.submit(dto);
  }
}
