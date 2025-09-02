import { Module } from '@nestjs/common';
import { PrismaService } from './common/services/prisma.service';
import { MistralService } from './common/services/mistral.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ChatModule],
  providers: [PrismaService, MistralService],
})
export class AppModule {}
