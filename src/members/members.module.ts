import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MembersService } from './members.service';

@Module({
  imports: [PrismaModule],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
