import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MistralService {
  private readonly logger = new Logger(MistralService.name);
  private readonly apiUrl = 'http://127.0.0.1:11434/api/chat'; // Added /api/chat
  private readonly model = process.env.MISTRAL_MODEL || 'mistral';

  async createStreamingResponse(messages: any[]) {
    try {
      const formattedMessages = messages.map((msg) => ({
        role: msg.role.toLowerCase(),
        content: msg.content,
      }));

      this.logger.log('Calling Mistral API with', formattedMessages);

      const response = await fetch(this.apiUrl, {
        // Use the full URL
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: formattedMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Mistral API error: ${response.status} ${response.statusText} - ${errorText}`
        );
        throw new Error(`Mistral API error: ${response.statusText}`);
      }

      return response.body;
    } catch (error) {
      this.logger.error('Error calling Mistral API', error);
      throw error;
    }
  }
}
