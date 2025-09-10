import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Header } from './header';
import { Chat } from 'libs/core-data/src/lib/services/chat';

describe('Header', () => {
  let fixture: ComponentFixture<Header>;
  let component: Header;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Header], // standalone component
    }).compileComponents();

    fixture = TestBed.createComponent(Header);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('chats', [] as Chat[]);
    fixture.componentRef.setInput('selectedChatId', null);

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit createChat event', () => {
    const spy = jest.spyOn(component.createChat, 'emit');
    component.onCreateChat();
    expect(spy).toHaveBeenCalled();
  });

  it('should emit selectChat with chatId', () => {
    const spy = jest.spyOn(component.selectChat, 'emit');
    component.onSelectChat('123');
    expect(spy).toHaveBeenCalledWith('123');
  });

  it('should emit deleteChat with chatId and event', () => {
    const spy = jest.spyOn(component.deleteChat, 'emit');
    const mockEvent = new Event('click');
    component.onDeleteChat('abc', mockEvent);
    expect(spy).toHaveBeenCalledWith({ chatId: 'abc', event: mockEvent });
  });
});
