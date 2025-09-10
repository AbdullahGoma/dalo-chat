import { CommonModule } from '@angular/common';
import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-footer',
  imports: [CommonModule, FormsModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  message = model.required<string>();

  // Inputs
  isSending = input.required<boolean>();

  // Outputs
  sendMessage = output<void>();
  keyDown = output<KeyboardEvent>();

  onSendMessage() {
    this.sendMessage.emit();
  }

  onKeyDown(event: KeyboardEvent) {
    this.keyDown.emit(event);
  }
}
