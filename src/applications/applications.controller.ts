import { Body, Controller, Post } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';

@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Post()
  submit(@Body() dto: CreateApplicationDto) {
    return this.applications.submit(dto);
  }
}
