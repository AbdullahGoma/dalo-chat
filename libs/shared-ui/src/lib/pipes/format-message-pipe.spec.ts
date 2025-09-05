import { TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { FormatMessagePipe } from './format-message-pipe';

describe('FormatMessagePipe', () => {
  let pipe: FormatMessagePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [FormatMessagePipe],
    });

    pipe = TestBed.inject(FormatMessagePipe);
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should sanitize html', () => {
    const sanitizer = TestBed.inject(DomSanitizer);
    const safe = pipe.transform('<b>hello</b>');
    expect(safe).toBeTruthy();
  });
});
