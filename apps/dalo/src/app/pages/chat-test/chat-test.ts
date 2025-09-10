import { CommonModule, DatePipe } from '@angular/common';
import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatService } from 'libs/core-data/src/lib/services/chat';
import { ModalService } from 'libs/shared-ui/src/lib/components/modal/modal-service/modal-service';
import {
  ConfirmationModalData,
  ModalAction,
  ModalType,
} from 'libs/shared-ui/src/lib/components/modal/types/modal.types';
import { FormatMessagePipe } from 'libs/shared-ui/src/lib/pipes/format-message-pipe';
import { Header } from '../../common/header/header';
import { Footer } from '../../common/footer/footer';

@Component({
  selector: 'app-chat-test',
  imports: [
    CommonModule,
    FormsModule,
    DatePipe,
    FormatMessagePipe,
    Header,
    Footer,
  ],
  templateUrl: './chat-test.html',
  styleUrl: './chat-test.css',
})
export class ChatTest implements AfterViewInit, OnDestroy, AfterViewChecked {
  private chatService = inject(ChatService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private modalService = inject(ModalService);
  chats = this.chatService.chats;
  messages = this.chatService.messages;
  loading = this.chatService.loading;
  currentPage = this.chatService.currentPage;
  hasMoreMessages = this.chatService.hasMoreMessages;

  loadMoreTrigger = viewChild<ElementRef>('loadMoreTrigger');
  messagesContainer = viewChild<ElementRef>('messagesContainer');

  private intersectionObserver?: IntersectionObserver;
  private shouldScrollToBottom = false;
  private isInitialLoad = false;

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

  chatId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('chatId')))
  );

  constructor() {
    this.chatService.loadChats();

    if (this.chatId()) {
      this.selectChat(this.chatId()!);
    } else {
      this.selectedChatId.set(null);
    }

    effect(() => {
      const currentMessages = this.messages();
      if (this.shouldScrollToBottom && currentMessages.length > 0) {
        setTimeout(() => this.scrollToBottom(), 50);
        this.shouldScrollToBottom = false;
      }
    });
  }

  ngAfterViewInit() {
    this.setupIntersectionObserver();
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
  }

  private setupIntersectionObserver() {
    if (!('IntersectionObserver' in window)) return;

    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            this.hasMoreMessages() &&
            !this.loading()
          ) {
            this.loadMoreMessages();
          }
        });
      },
      {
        root: null,
        rootMargin: '20px',
        threshold: 0.1,
      }
    );

    if (this.loadMoreTrigger()?.nativeElement) {
      this.intersectionObserver.observe(this.loadMoreTrigger()?.nativeElement);
    }
  }

  private scrollToBottom() {
    try {
      const el = this.messagesContainer()?.nativeElement;
      if (!el) return;
      const style = window.getComputedStyle(el);
      const isReverse = style.flexDirection === 'column-reverse';
      if (isReverse) {
        el.scrollTop = 0;
      } else {
        el.scrollTop = el.scrollHeight;
      }
    } catch (e) {
      // ignore
    }
  }

  private scrollToLastUserMessage() {
    const container = this.messagesContainer()?.nativeElement;
    if (!container) return;

    const messages = this.messages();
    const lastUserMessageIndex = messages
      .map((msg) => msg.role)
      .lastIndexOf('USER');

    if (lastUserMessageIndex !== -1) {
      const messageElements = container.querySelectorAll('.message-item');
      if (messageElements[lastUserMessageIndex]) {
        messageElements[lastUserMessageIndex].scrollIntoView({
          behavior: 'smooth',
          block: 'end',
        });
      }
    } else {
      // If no user messages, scroll to bottom
      this.scrollToBottom();
    }
  }

  createChat() {
    this.chatService.createChat('New Chat').subscribe((created) => {
      let chatId: string | null = null;

      if (created?.id) {
        chatId = created.id;
      } else if (created?.chatId) {
        chatId = created.chatId;
      }

      if (!chatId) {
        const all = this.chats();
        if (all.length) chatId = all[all.length - 1].id;
      }

      if (chatId) {
        this.router.navigate(['/', chatId]);
      }

      if (chatId) {
        this.selectedChatId.set(chatId);
        this.chatService.loadMessages(chatId);

        setTimeout(() => {
          this.setupIntersectionObserver();
          this.scrollToBottom();
        }, 50);
      }
    });
  }

  async selectChat(chatId: string) {
    this.selectedChatId.set(chatId);
    this.isInitialLoad = true;

    // Load messages for this chat
    await this.chatService.loadMessages(chatId);

    const currentMessages = this.messages();

    // Check if this is a completely new chat (no messages)
    if (currentMessages.length === 0) {
      // After adding system greeting, scroll to bottom
      this.shouldScrollToBottom = true;
    } else {
      // Existing chat - scroll to last user message
      setTimeout(() => this.scrollToLastUserMessage(), 100);
    }

    // Re-setup intersection observer after messages are loaded
    setTimeout(() => {
      this.setupIntersectionObserver();
    }, 100);

    this.isInitialLoad = false;

    this.router.navigate(['/', chatId]);
  }

  async sendMessage() {
    if (!this.selectedChatId() || !this.message.trim() || this.isSending())
      return;

    this.isSending.set(true);
    this.shouldScrollToBottom = true;

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

    const chat = this.chats().find((c) => c.id === chatId);
    if (!chat) return;

    const actions: readonly ModalAction[] = [
      {
        text: 'Cancel',
        style: 'secondary',
        handler: () => this.modalService.closeModal(ModalType.Confirmation),
      },
      {
        text: 'Delete',
        style: 'danger',
        handler: () => {
          this.chatService.deleteChat(chatId);
          if (this.selectedChatId() === chatId) {
            this.selectedChatId.set(null);
          }
          this.router.navigate(['/']);
          this.modalService.closeModal(ModalType.Confirmation);
        },
      },
    ] as const;

    const modalData: ConfirmationModalData = {
      title: 'Delete Chat',
      message: `Are you sure you want to delete "${chat.title}"? This action cannot be undone.`,
      actions,
    };

    this.modalService.openModal(ModalType.Confirmation, modalData);
  }

  loadMoreMessages() {
    const chatId = this.selectedChatId();
    if (chatId && this.hasMoreMessages() && !this.loading()) {
      // Store current scroll position before loading more messages
      const container = this.messagesContainer()?.nativeElement;
      const oldScrollHeight = container?.scrollHeight || 0;

      this.chatService.loadMoreMessages(chatId).then(() => {
        // Maintain scroll position after loading older messages
        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            const scrollDifference = newScrollHeight - oldScrollHeight;
            container.scrollTop += scrollDifference;
          }
        }, 50);
      });
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
