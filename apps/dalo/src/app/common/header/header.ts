import { CommonModule } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { Theme } from 'libs/core-data/src/lib/services/theme';
import { HoverDropdown } from 'libs/shared-ui/src/lib/directives/hover-dropdown';
import { Chat } from 'libs/core-data/src/lib/services/chat';

@Component({
  selector: 'app-header',
  imports: [HoverDropdown, CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  themeService = inject(Theme);

  // Inputs
  chats = input.required<Chat[]>();
  selectedChatId = input.required<string | null>();

  // Outputs
  createChat = output<void>();
  selectChat = output<string>();
  deleteChat = output<{ chatId: string; event: Event }>();

  onToggleTheme() {
    this.themeService.toggleTheme();
  }

  onCreateChat() {
    this.createChat.emit();
  }

  onSelectChat(chatId: string) {
    this.selectChat.emit(chatId);
  }

  onDeleteChat(chatId: string, event: Event) {
    this.deleteChat.emit({ chatId, event });
  }
}
