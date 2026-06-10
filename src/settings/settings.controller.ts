import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('recruit')
  getRecruit() {
    return this.settings.getRecruit();
  }

  @Get('about')
  getAbout() {
    return this.settings.getAbout();
  }
}
