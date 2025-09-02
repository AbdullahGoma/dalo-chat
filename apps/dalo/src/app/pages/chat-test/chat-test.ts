import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chat } from 'libs/core-data/src/lib/services/chat';

@Component({
  selector: 'app-chat-test',
  imports: [FormsModule],
  templateUrl: './chat-test.html',
  styleUrl: './chat-test.css',
})
export class ChatTest {
  private chatService = inject(Chat);
  chats = this.chatService.chats;
  messages = this.chatService.messages;
  loading = this.chatService.loading;

  selectedChatId = signal<string | null>(null);
  message = '';

  constructor() {
    this.chatService.loadChats();
  }

  createChat() {
    this.chatService.createChat('Test Chat');
  }

  selectChat(chatId: string) {
    this.selectedChatId.set(chatId);
    this.chatService.messages.set([]);
  }

  sendMessage() {
    if (!this.selectedChatId() || !this.message) return;
    this.chatService.streamMessage(this.selectedChatId()!, this.message);
    this.message = '';
  }
}
