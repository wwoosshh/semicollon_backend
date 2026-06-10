import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ApplicationsService } from '../applications/applications.service';
import { SettingsService } from '../settings/settings.service';
import { MembersService } from '../members/members.service';
import { UpdateStatusDto } from './dto/update-status.dto';
import { SetRecruitDto } from './dto/set-recruit.dto';
import { SetInviteCodeDto } from './dto/set-invite-code.dto';
import { SetAboutDto } from './dto/set-about.dto';
import { UpdateRoleDto } from '../members/dto/update-role.dto';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(
    private readonly applications: ApplicationsService,
    private readonly settings: SettingsService,
    private readonly members: MembersService,
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

  @Patch('settings/about')
  async setAbout(@Body() dto: SetAboutDto) {
    await this.settings.setAbout(dto);
    return this.settings.getAbout();
  }

  @Get('members')
  listMembers() {
    return this.members.list();
  }

  @Patch('members/:id/role')
  updateMemberRole(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.members.updateRole(req.user.id, id, dto.role);
  }

  @Delete('members/:id')
  async deleteMember(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    await this.members.deleteMember(req.user.id, id);
    return { ok: true };
  }
}
