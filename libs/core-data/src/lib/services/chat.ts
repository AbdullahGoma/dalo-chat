import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface Message {
  id: string;
  content: string;
  role: 'USER' | 'ASSISTANT';
  createdAt: string;
  chatId: string;
}

interface Chat {
  id: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private apiUrl = 'http://localhost:3000/api';
  private messagesPerPage = 10;
  private http = inject(HttpClient);

  chats = signal<Chat[]>([]);
  messages = signal<Message[]>([]);
  loading = signal(false);
  currentPage = signal(1);
  hasMoreMessages = signal(false);

  loadChats() {
    this.http
      .get<Chat[]>(`${this.apiUrl}/chat`)
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

  async loadMessages(chatId: string, page = 1) {
    this.loading.set(true);
    try {
      const response = await this.http
        .get<{ messages: Message[]; hasMore: boolean }>(
          `${this.apiUrl}/chat/${chatId}/messages?page=${page}&limit=${this.messagesPerPage}`
        )
        .toPromise();

      if (response) {
        if (page === 1) {
          this.messages.set(response.messages);
        } else {
          // Prepend older messages to the beginning
          this.messages.update((current) => [...response.messages, ...current]);
        }
        this.hasMoreMessages.set(response.hasMore);
        this.currentPage.set(page);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      this.loading.set(false);
    }
  }

  loadMoreMessages(chatId: string) {
    const nextPage = this.currentPage() + 1;
    this.loadMessages(chatId, nextPage);
  }

  async streamMessage(chatId: string, message: string) {
    this.loading.set(true);

    // Create optimistic user message
    const userMessage: Message = {
      id: 'temp-' + Date.now(),
      content: message,
      role: 'USER',
      createdAt: new Date().toISOString(),
      chatId: chatId,
    };

    // Add user message immediately
    this.messages.update((msgs) => [...msgs, userMessage]);

    let aiResponse = '';
    const aiMessage: Message = {
      id: 'temp-ai-' + Date.now(),
      content: '',
      role: 'ASSISTANT',
      createdAt: new Date().toISOString(),
      chatId: chatId,
    };

    // Add initial AI message placeholder
    this.messages.update((msgs) => [...msgs, aiMessage]);

    try {
      const response = await fetch(`${this.apiUrl}/chat/${chatId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify({ message }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const messages = buffer.split('\n\n');
          buffer = messages.pop() || '';

          for (const sseMessage of messages) {
            if (!sseMessage.trim()) continue;

            const lines = sseMessage.split('\n');

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;

              const dataStr = line.slice(6).trim();

              if (dataStr === '[DONE]') {
                // Reload messages to get the final saved versions from backend
                await this.loadMessages(chatId);
                return;
              }

              try {
                const data = JSON.parse(dataStr);

                if (data.type === 'connected') {
                  continue;
                }

                if (data.error) {
                  throw new Error(data.error);
                }

                if (data.content) {
                  aiResponse += data.content;

                  // Update the AI message
                  this.messages.update((msgs) => {
                    const newMsgs = [...msgs];
                    const lastIndex = newMsgs.length - 1;
                    if (
                      lastIndex >= 0 &&
                      newMsgs[lastIndex].role === 'ASSISTANT'
                    ) {
                      newMsgs[lastIndex] = {
                        ...newMsgs[lastIndex],
                        content: aiResponse,
                      };
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
        if (lastIndex >= 0 && newMsgs[lastIndex].role === 'ASSISTANT') {
          newMsgs[lastIndex] = {
            ...newMsgs[lastIndex],
            content: `Error: ${error.message}`,
          };
        }
        return newMsgs;
      });
    } finally {
      this.loading.set(false);
    }
  }
}
