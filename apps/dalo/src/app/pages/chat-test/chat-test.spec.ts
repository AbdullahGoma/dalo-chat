import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatTest } from './chat-test';
import { HttpClientModule } from '@angular/common/http';
import { ChatService } from 'libs/core-data/src/lib/services/chat';
import { signal } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';

class MockChatService {
  chats = signal([]);
  messages = signal([]);
  loading = signal(false);
  currentPage = signal(1);
  hasMoreMessages = signal(true);

  loadChats = jest.fn();
  loadMessages = jest.fn(() => Promise.resolve());
  loadMoreMessages = jest.fn(() => Promise.resolve());
  createChat = jest.fn();
  deleteChat = jest.fn();
  streamMessage = jest.fn(() => Promise.resolve());
}

beforeAll(() => {
  class MockIntersectionObserver {
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
  }
  (global as any).IntersectionObserver = MockIntersectionObserver;
});

describe('ChatTest', () => {
  let component: ChatTest;
  let fixture: ComponentFixture<ChatTest>;
  let mockService: MockChatService;

  beforeEach(async () => {
    mockService = new MockChatService();

    await TestBed.configureTestingModule({
      imports: [ChatTest, HttpClientModule, RouterTestingModule],
      providers: [{ provide: ChatService, useValue: mockService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatTest);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should select a chat and load messages', async () => {
    const chatId = '123';
    await component.selectChat(chatId);
    expect(component.selectedChatId()).toBe(chatId);
    expect(mockService.loadMessages).toHaveBeenCalledWith(chatId);
  });

  it('should send a message', async () => {
    const chatId = '123';
    component.selectedChatId.set(chatId);
    component.message = 'Hello';
    await component.sendMessage();
    expect(mockService.streamMessage).toHaveBeenCalledWith(chatId, 'Hello');
    expect(component.message).toBe('');
  });

  it('should toggle theme', () => {
    const initial = component.isDarkTheme();
    component.toggleTheme();
    expect(component.isDarkTheme()).toBe(!initial);
  });

  it('should call loadMoreMessages if conditions met', async () => {
    const chatId = '123';
    component.selectedChatId.set(chatId);
    await component.loadMoreMessages();
    expect(mockService.loadMoreMessages).toHaveBeenCalledWith(chatId);
  });
});
