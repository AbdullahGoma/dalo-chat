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

    try {
      const response = await fetch(`${this.apiUrl}/chat/${chatId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiResponse = 'AI: ';
      let buffer = ''; // Add buffer to handle partial chunks

      // Add the initial AI message
      this.messages.update((msgs) => [...msgs, aiResponse]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk; // Add to buffer

        // Split by double newline (SSE message boundary)
        const messages = buffer.split('\n\n');
        // Keep the last potentially incomplete message in buffer
        buffer = messages.pop() || '';

        for (const sseMessage of messages) {
          const lines = sseMessage.split('\n');

          for (const line of lines) {
            if (line.trim() === '') continue;

            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();

              if (dataStr === '[DONE]') {
                console.log('Stream completed');
                break;
              }

              try {
                const data = JSON.parse(dataStr);
                if (data.content) {
                  aiResponse += data.content;
                  console.log('Adding content:', data.content); // Debug log

                  // Update the last message (which should be the AI message)
                  this.messages.update((msgs) => {
                    const newMsgs = [...msgs];
                    const lastIndex = newMsgs.length - 1;
                    if (lastIndex >= 0) {
                      newMsgs[lastIndex] = aiResponse;
                    }
                    return newMsgs;
                  });
                }
              } catch (e) {
                console.warn('Failed to parse SSE data:', dataStr, e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error streaming message:', error);
      // this.messages.update((msgs) => [...msgs, `AI: Error - ${error.message}`]);
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
