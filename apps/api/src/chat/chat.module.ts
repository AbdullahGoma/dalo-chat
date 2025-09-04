import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { MistralService } from '../app/common/services/mistral.service';
import { PrismaService } from '../app/common/services/prisma.service';

@Module({
  controllers: [ChatController],
  providers: [ChatService, PrismaService, MistralService],
})
export class ChatModule {}
