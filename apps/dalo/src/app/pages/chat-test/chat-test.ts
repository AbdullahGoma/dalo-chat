import { DatePipe } from '@angular/common';
import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChatService } from 'libs/core-data/src/lib/services/chat';
import { FormatMessagePipe } from 'libs/shared-ui/src/lib/pipes/format-message-pipe';
import { HoverDropdown } from 'libs/shared-ui/src/lib/directives/hover-dropdown';

@Component({
  selector: 'app-chat-test',
  imports: [FormsModule, DatePipe, FormatMessagePipe, HoverDropdown],
  templateUrl: './chat-test.html',
  styleUrl: './chat-test.css',
})
export class ChatTest {
  private chatService = inject(ChatService);
  chats = this.chatService.chats;
  messages = this.chatService.messages;
  loading = this.chatService.loading;
  currentPage = this.chatService.currentPage;
  hasMoreMessages = this.chatService.hasMoreMessages;

  selectedChatId = signal<string | null>(null);
  message = '';
  isSending = signal(false);
  isDarkTheme = signal(false);

  // Computed property to get selected chat details
  selectedChat = computed(() => {
    const chatId = this.selectedChatId();
    if (!chatId) return null;
    return this.chats().find((chat) => chat.id === chatId) || null;
  });

  constructor() {
    this.chatService.loadChats();
  }

  createChat() {
    this.chatService.createChat('New Chat');
  }

  async selectChat(chatId: string) {
    this.selectedChatId.set(chatId);
    // Load messages for this chat
    await this.chatService.loadMessages(chatId);
  }

  async sendMessage() {
    if (!this.selectedChatId() || !this.message.trim() || this.isSending())
      return;

    this.isSending.set(true);
    try {
      await this.chatService.streamMessage(
        this.selectedChatId()!,
        this.message
      );
      this.message = '';
    } finally {
      this.isSending.set(false);
    }
  }

  deleteChat(chatId: string, event: Event) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this chat?')) {
      this.chatService.deleteChat(chatId);
      if (this.selectedChatId() === chatId) {
        this.selectedChatId.set(null);
      }
    }
  }

  loadMoreMessages() {
    const chatId = this.selectedChatId();
    if (chatId && this.hasMoreMessages()) {
      this.chatService.loadMoreMessages(chatId);
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  toggleTheme() {
    this.isDarkTheme.update((current) => !current);
  }
}
