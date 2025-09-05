import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../app/common/services/prisma.service';
import { MistralService } from '../app/common/services/mistral.service';
import { Response } from 'express';

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

  async getMessages(chatId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    // Get total count to determine if there are more messages
    const totalMessages = await this.prisma.message.count({
      where: { chatId },
    });

    // Get messages for this page (ordered by createdAt DESC for pagination, but we'll reverse for display)
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    // Reverse the messages so they appear in chronological order
    const orderedMessages = messages.reverse();

    const hasMore = skip + messages.length < totalMessages;

    return {
      messages: orderedMessages,
      hasMore,
      total: totalMessages,
      page,
      limit,
    };
  }

  async getChatHistory(chatId: string) {
    return this.prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async streamAIResponse(chatId: string, message: string, res: Response) {
    this.logger.log(`Starting stream for chat ${chatId}`);

    let fullResponse = '';
    let isStreamStarted = false;

    // Ensure we don't leave hanging connections
    const cleanup = () => {
      if (!res.destroyed && !res.headersSent) {
        res.end();
      }
    };

    // Set up cleanup on client disconnect
    res.on('close', () => {
      this.logger.log('Client disconnected from stream');
      cleanup();
    });

    res.on('error', (err) => {
      this.logger.error('Response stream error:', err);
      cleanup();
    });

    try {
      // Check chat exists
      const chat = await this.prisma.chat.findFirst({
        where: { id: chatId, isActive: true },
      });

      if (!chat) {
        this.logger.error(`Chat ${chatId} not found`);
        res.status(404).json({ error: 'Chat not found' });
        return;
      }

      // Save user message first
      await this.prisma.message.create({
        data: { content: message, role: 'USER', chatId },
      });

      // Get chat history for context
      const messages = await this.getChatHistory(chatId);
      this.logger.log(`Retrieved ${messages.length} messages from history`);

      // Set SSE headers immediately
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      });

      isStreamStarted = true;

      // Send initial ping to establish connection
      res.write('data: {"type":"connected"}\n\n');

      // Get streaming response from Mistral
      const streamResponse = await this.mistralService.createStreamingResponse(
        messages
      );

      if (!streamResponse) {
        throw new Error('No streaming response received');
      }

      const reader = streamResponse.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          this.logger.log('Stream reading completed');
          break;
        }

        if (res.destroyed) {
          this.logger.log('Response was destroyed, stopping stream');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line.trim());

            if (data.message && data.message.content) {
              const content = data.message.content;
              fullResponse += content;

              // Send content to client
              const ssePayload = JSON.stringify({ content });
              res.write(`data: ${ssePayload}\n\n`);

              this.logger.debug(`Sent: ${content}`);
            }

            // Check if stream is done
            if (data.done === true) {
              this.logger.log('Mistral indicated stream completion');
              break;
            }
          } catch (parseErr) {
            this.logger.warn(`Failed to parse line: ${line}`, parseErr.message);
            continue;
          }
        }
      }

      // Save the complete assistant response
      if (fullResponse.trim()) {
        await this.prisma.message.create({
          data: { content: fullResponse, role: 'ASSISTANT', chatId },
        });
        this.logger.log(
          `Saved assistant response: ${fullResponse.length} chars`
        );

        // Update chat's updatedAt timestamp
        await this.prisma.chat.update({
          where: { id: chatId },
          data: { updatedAt: new Date() },
        });
      }

      // Send completion signal
      res.write('data: [DONE]\n\n');
      res.end();

      this.logger.log('Stream completed successfully');
    } catch (error) {
      this.logger.error('Error in streamAIResponse:', error);

      if (!isStreamStarted) {
        // Haven't started SSE yet, can send regular error response
        if (!res.headersSent) {
          res.status(500).json({
            error:
              error instanceof Error ? error.message : 'Internal server error',
          });
        }
      } else {
        // SSE already started, send error through stream
        if (!res.destroyed) {
          const errorPayload = JSON.stringify({
            error:
              error instanceof Error ? error.message : 'Stream error occurred',
          });
          res.write(`data: ${errorPayload}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        }
      }
    }
  }
}
