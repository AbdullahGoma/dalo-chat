import { Component } from '@angular/core';
import { ModalType } from '../types/modal.types';
import { ModalBase } from '../modal/modal-base';

@Component({
  selector: 'lib-confirmation-modal',
  imports: [],
  templateUrl: './confirmation-modal.html',
  styleUrl: './confirmation-modal.css',
})
export class ConfirmationModal extends ModalBase {
  readonly modalType = ModalType.Confirmation;

  protected getActionButtonClass(style?: string): string {
    const baseClass =
      'px-4 py-2 text-sm font-medium rounded-3 transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-offset-1 cursor-pointer';

    switch (style) {
      case 'primary':
        return `${baseClass} bg-surface text-foreground hover:bg-surface/50 focus:ring-border`;
      case 'success':
        return `${baseClass} bg-success text-background hover:bg-success/50 focus:ring-border`;
      case 'danger':
        return `${baseClass} bg-destructive text-background hover:bg-destructive/80 focus:ring-border`;
      case 'warning':
        return `${baseClass} bg-yellow-600 text-primary hover:bg-yellow-700 focus:ring-border`;
      default:
        return `${baseClass} bg-surface text-foreground hover:bg-surface/50 focus:ring-border`;
    }
  }
}
