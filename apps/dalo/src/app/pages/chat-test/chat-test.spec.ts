import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatTest } from './chat-test';
import { HttpClientModule } from '@angular/common/http';

describe('ChatTest', () => {
  let component: ChatTest;
  let fixture: ComponentFixture<ChatTest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatTest, HttpClientModule],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatTest);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
