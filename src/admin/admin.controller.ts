import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ApplicationsService } from '../applications/applications.service';
import { SettingsService } from '../settings/settings.service';
import { UpdateStatusDto } from './dto/update-status.dto';
import { SetRecruitDto } from './dto/set-recruit.dto';
import { SetInviteCodeDto } from './dto/set-invite-code.dto';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly applications: ApplicationsService,
    private readonly settings: SettingsService,
  ) {}

  @Get('applications')
  listApplications(@Query('status') status?: string) {
    return this.applications.list(status);
  }

  @Patch('applications/:id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.applications.updateStatus(id, dto.status);
  }

  @Patch('settings/recruit')
  async setRecruit(@Body() dto: SetRecruitDto) {
    if (dto.start && dto.end && new Date(dto.start) > new Date(dto.end)) {
      throw new BadRequestException('시작일은 마감일보다 앞서야 합니다.');
    }
    await this.settings.setRecruit(dto.start ?? null, dto.end ?? null);
    return this.settings.getRecruit();
  }

  @Patch('settings/invite-code')
  async setInviteCode(@Body() dto: SetInviteCodeDto) {
    await this.settings.setInviteCode(dto.code);
    return { ok: true };
  }
}
