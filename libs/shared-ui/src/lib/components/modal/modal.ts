import { Component, effect, inject } from '@angular/core';
import { ModalType } from './types/modal.types';
import { ModalService } from './modal-service/modal-service';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { ClickOutside } from './directives/click-outside';

@Component({
  selector: 'lib-modal',
  imports: [
    NgTemplateOutlet,
    // ClickOutsideDirective,
    CommonModule,
    ClickOutside,
  ],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  private readonly modalService = inject(ModalService);

  protected readonly activeModals = this.modalService.activeModalsList;
  protected readonly modalTemplates = this.modalService.modalTemplatesMap;
  protected readonly modalType = ModalType;

  constructor() {
    effect(() => {
      console.log('Active modals changed:', this.activeModals());
    });
  }

  closeModal(modalType: string): void {
    this.modalService.closeModal(modalType);
  }

  handleBackdropClick(modalType: string): void {
    this.modalService.closeModal(modalType);
  }
}
