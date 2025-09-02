import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Res,
  Query,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { Response } from 'express';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get()
  async getChats() {
    return this.chatService.getChats('user-1');
  }

  @Post()
  async createChat(@Body() body: { title?: string }) {
    return this.chatService.createChat('user-1', body.title);
  }

  @Post(':id/message')
  async streamMessagePost(
    @Param('id') chatId: string,
    @Body() body: { message: string },
    @Res() res: Response
  ) {
    await this.chatService.streamAIResponse(chatId, body.message, res);
  }

  @Get(':id/message')
  async streamMessageGet(
    @Param('id') chatId: string,
    @Query('message') message: string,
    @Res() res: Response
  ) {
    await this.chatService.streamAIResponse(chatId, message, res);
  }

  @Delete(':id')
  async deleteChat(@Param('id') chatId: string) {
    return this.chatService.deleteChat(chatId);
  }
}
