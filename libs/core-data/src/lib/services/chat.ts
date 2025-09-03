import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class Chat {
  private apiUrl = 'http://localhost:3000/api';

  chats = signal<any[]>([]);
  messages = signal<string[]>([]);
  loading = signal(false);

  constructor(private http: HttpClient) {}

  loadChats() {
    this.http
      .get<any[]>(`${this.apiUrl}/chat`)
      .subscribe((data) => this.chats.set(data));
  }

  createChat(title?: string) {
    this.http
      .post(`${this.apiUrl}/chat`, { title })
      .subscribe(() => this.loadChats());
  }

  deleteChat(chatId: string) {
    this.http
      .delete(`${this.apiUrl}/chat/${chatId}`)
      .subscribe(() => this.loadChats());
  }

  async streamMessage(chatId: string, message: string) {
    this.loading.set(true);
    this.messages.update((msgs) => [...msgs, `You: ${message}`]);

    let aiResponse = 'AI: ';

    // Add the initial AI message placeholder
    this.messages.update((msgs) => [...msgs, aiResponse]);

    try {
      console.log(`Starting stream to: ${this.apiUrl}/chat/${chatId}/message`);

      const response: any = await fetch(
        `${this.apiUrl}/chat/${chatId}/message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify({ message }),
        }
      );

      console.log('Response status:', response.status);
      console.log(
        'Response headers:',
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      console.log('Starting to read stream...');

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            console.log('Stream reading completed');
            break;
          }

          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          console.log('Received chunk:', chunk);

          // Process complete SSE messages
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || ''; // Keep incomplete message in buffer

          for (const sseMessage of messages) {
            if (!sseMessage.trim()) continue;

            const lines = sseMessage.split('\n');

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;

              const dataStr = line.slice(6).trim();
              console.log('Processing data:', dataStr);

              if (dataStr === '[DONE]') {
                console.log('Stream completed with [DONE]');
                return;
              }

              try {
                const data = JSON.parse(dataStr);

                // Handle different message types
                if (data.type === 'connected') {
                  console.log('Connection established');
                  continue;
                }

                if (data.error) {
                  console.error('Stream error:', data.error);
                  throw new Error(data.error);
                }

                if (data.content) {
                  aiResponse += data.content;
                  console.log('Adding content:', data.content);

                  // Update the AI message
                  this.messages.update((msgs) => {
                    const newMsgs = [...msgs];
                    const lastIndex = newMsgs.length - 1;
                    if (lastIndex >= 0) {
                      newMsgs[lastIndex] = aiResponse;
                    }
                    return newMsgs;
                  });
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', dataStr, parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error: any) {
      console.error('Error streaming message:', error);

      // Update the AI message with error
      this.messages.update((msgs) => {
        const newMsgs = [...msgs];
        const lastIndex = newMsgs.length - 1;
        if (lastIndex >= 0) {
          newMsgs[lastIndex] = `AI: Error - ${error.message}`;
        }
        return newMsgs;
      });
    } finally {
      this.loading.set(false);
    }
  }

  async testStream() {
    try {
      const response = await fetch('http://127.0.0.1:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistral',
          messages: [{ role: 'user', content: 'Hello' }],
          stream: true,
        }),
      });

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        console.log('Raw chunk:', chunk);

        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            console.log('Line:', line);
            try {
              const data = JSON.parse(line);
              console.log('Parsed data:', data);
            } catch (e) {
              console.log('Not JSON:', line);
            }
          }
        }
      }
    } catch (error) {
      console.error('Test error:', error);
    }
  }

  async testBackendStream() {
    try {
      const response = await fetch(`${this.apiUrl}/chat/test-chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'Hello' }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        console.log('Backend response chunk:', chunk);

        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            console.log('SSE data:', line.slice(6));
          }
        }
      }
    } catch (error) {
      console.error('Backend test error:', error);
    }
  }
}
