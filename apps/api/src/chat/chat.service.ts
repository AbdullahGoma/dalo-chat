import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../app/common/services/prisma.service';
import { MistralService } from '../app/common/services/mistral.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  constructor(
    private prisma: PrismaService,
    private mistralService: MistralService
  ) {}

  async createChat(userId: string, title?: string) {
    const chatCount = await this.prisma.chat.count({
      where: { userId, isActive: true },
    });
    if (chatCount >= 5) throw new Error('Maximum chat limit of 5 reached');

    return this.prisma.chat.create({
      data: { title: title || 'New Chat', userId },
    });
  }

  async getChats(userId: string) {
    return this.prisma.chat.findMany({
      where: { userId, isActive: true },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async deleteChat(chatId: string) {
    return this.prisma.chat.update({
      where: { id: chatId },
      data: { isActive: false },
    });
  }

  async getChatHistory(chatId: string) {
    return this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async streamAIResponse(chatId: string, message: string, res: any) {
    let fullResponse = '';

    try {
      // Check chat exists
      const chat = await this.prisma.chat.findFirst({
        where: { id: chatId, isActive: true },
      });

      if (!chat) {
        res.status(404).json({ error: 'Chat not found' });
        return;
      }

      // Save user message
      await this.prisma.message.create({
        data: { content: message, role: 'USER', chatId },
      });

      const messages = await this.getChatHistory(chatId);
      const response = await this.mistralService.createStreamingResponse(
        messages
      );

      if (!response) {
        throw new Error('Streaming response is undefined');
      }

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.flushHeaders();

      const reader = response.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.trim() && line !== 'data: [DONE]') {
            try {
              // Parse the Ollama response
              const data = JSON.parse(line.trim());

              if (data.message?.content) {
                fullResponse += data.message.content;

                // Send proper SSE format to frontend
                const sseData = JSON.stringify({
                  content: data.message.content,
                });
                res.write(`data: ${sseData}\n\n`);
              }
            } catch (err) {
              console.warn('Failed to parse Ollama response:', line, err);
            }
          }
        }
      }

      // Save assistant message
      await this.prisma.message.create({
        data: { content: fullResponse, role: 'ASSISTANT', chatId },
      });

      // End SSE
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err) {
      console.error('Error in streamAIResponse:', err);

      if (!res.headersSent) {
        res
          .status(500)
          .json({ error: err instanceof Error ? err.message : err });
      } else {
        res.end();
      }
    }
  }
}
