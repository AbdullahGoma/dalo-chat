import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MistralService {
  private readonly logger = new Logger(MistralService.name);
  private readonly apiUrl = 'http://127.0.0.1:11434/api/chat';
  private readonly model = process.env.MISTRAL_MODEL || 'mistral';

  async createStreamingResponse(messages: any[]) {
    try {
      const formattedMessages = messages.map((msg) => ({
        role: msg.role.toLowerCase(),
        content: msg.content,
      }));

      this.logger.log(
        'Calling Mistral API with messages:',
        formattedMessages.length
      );
      this.logger.debug(
        'Formatted messages:',
        JSON.stringify(formattedMessages, null, 2)
      );

      const requestBody = {
        model: this.model,
        messages: formattedMessages,
        stream: true,
      };

      this.logger.log(`Making request to: ${this.apiUrl}`);
      this.logger.debug('Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      this.logger.log(
        `Response status: ${response.status} ${response.statusText}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Mistral API error: ${response.status} ${response.statusText} - ${errorText}`
        );
        throw new Error(`Mistral API error: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body from Mistral API');
      }

      this.logger.log('Successfully got streaming response from Mistral API');
      return response.body;
    } catch (error) {
      this.logger.error('Error calling Mistral API:', error);

      // Check if it's a connection error
      if (
        error.code === 'ECONNREFUSED' ||
        error.message.includes('ECONNREFUSED')
      ) {
        throw new Error(
          'Cannot connect to Ollama server. Make sure Ollama is running on http://127.0.0.1:11434'
        );
      }

      throw error;
    }
  }

  // Add a health check method
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch('http://127.0.0.1:11434/api/tags', {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      this.logger.warn('Ollama health check failed:', error.message);
      return false;
    }
  }
}
