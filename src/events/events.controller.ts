import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@Query() query: QueryEventsDto) {
    return this.events.list(query.from, query.to);
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateEventDto) {
    return this.events.create(dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventDto) {
    return this.events.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.events.remove(id);
  }
}
