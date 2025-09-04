import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Res,
  Query,
  HttpException,
  HttpStatus,
  Logger,
  Req,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { MistralService } from '../app/common/services/mistral.service';
import { Response, Request } from 'express';

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(
    private chatService: ChatService,
    private mistralService: MistralService
  ) {}

  @Get()
  async getChats() {
    return this.chatService.getChats('cmf47qgjt0000ndnsub779579');
  }

  @Post()
  async createChat(@Body() body: { title?: string }) {
    try {
      return await this.chatService.createChat(
        'cmf47qgjt0000ndnsub779579',
        body.title
      );
    } catch (error) {
      if (error.message.includes('Maximum chat limit')) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
      }
      throw new HttpException(
        'Failed to create chat',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('health')
  async healthCheck() {
    const isOllamaHealthy = await this.mistralService.checkHealth();
    return {
      status: 'ok',
      ollama: isOllamaHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    };
  }

  @Post(':id/message')
  async streamMessagePost(
    @Param('id') chatId: string,
    @Body() body: { message: string },
    @Req() req: Request,
    @Res() res: Response
  ) {
    this.logger.log(`POST stream request for chat ${chatId}`);

    try {
      // Validate inputs
      if (!body.message?.trim()) {
        res.status(400).json({ error: 'Message is required' });
        return;
      }

      if (!chatId?.trim()) {
        res.status(400).json({ error: 'Chat ID is required' });
        return;
      }

      // Check if Ollama is available
      const isHealthy = await this.mistralService.checkHealth();
      if (!isHealthy) {
        res.status(503).json({
          error: 'AI service unavailable. Make sure Ollama is running.',
        });
        return;
      }

      // Hand off to the service - it will handle the SSE response
      await this.chatService.streamAIResponse(chatId, body.message, res);
    } catch (error) {
      this.logger.error('Controller error:', error);

      if (!res.headersSent) {
        res.status(500).json({
          error: 'Failed to process message',
        });
      }
    }
  }

  @Delete(':id')
  async deleteChat(@Param('id') chatId: string) {
    return this.chatService.deleteChat(chatId);
  }
}
