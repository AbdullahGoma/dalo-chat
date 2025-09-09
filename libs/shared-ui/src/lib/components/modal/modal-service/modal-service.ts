import {
  Injectable,
  signal,
  computed,
  TemplateRef,
  effect,
} from '@angular/core';
import { ModalState, ModalConfig } from '../types/modal.types';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private readonly activeModals = signal<readonly ModalState[]>([]);
  private readonly modalTemplates = signal<
    Readonly<Record<string, TemplateRef<any>>>
  >({});
  private modalIdCounter = 0;

  readonly activeModalsList = computed(() => this.activeModals());
  readonly modalTemplatesMap = computed(() => this.modalTemplates());
  readonly hasActiveModals = computed(() => this.activeModals().length > 0);

  constructor() {
    this.setupGlobalKeyListener();
  }

  registerModalTemplate(type: string, template: TemplateRef<any>): void {
    this.modalTemplates.update((templates) => ({
      ...templates,
      [type]: template,
    }));
  }

  unregisterModalTemplate(type: string): void {
    this.modalTemplates.update((templates) => {
      const { [type]: _, ...rest } = templates;
      return rest;
    });
  }

  isModalOpen(modalType: string) {
    return computed(() =>
      this.activeModals().some((modal) => modal.type === modalType)
    );
  }

  openModal(config: ModalConfig | string, data?: any): string {
    const modalConfig: ModalConfig =
      typeof config === 'string' ? { type: config, data } : config;

    const modalId = `modal-${++this.modalIdCounter}`;
    const newModal: ModalState = {
      type: modalConfig.type,
      data: modalConfig.data,
      id: modalId,
    };

    this.closeModal(modalConfig.type);

    this.activeModals.update((modals) => [...modals, newModal]);

    document.body.classList.add('modal-open');

    return modalId;
  }

  closeModal(modalTypeOrId: string): void {
    this.activeModals.update((modals) => {
      const filtered = modals.filter(
        (modal) => modal.type !== modalTypeOrId && modal.id !== modalTypeOrId
      );

      if (filtered.length === 0) {
        document.body.classList.remove('modal-open');
      }

      return filtered;
    });
  }

  closeAllModals(): void {
    this.activeModals.set([]);
    document.body.classList.remove('modal-open');
  }

  getModalData<T = any>(modalType: string): T | undefined {
    return this.activeModals().find((modal) => modal.type === modalType)?.data;
  }

  private setupGlobalKeyListener(): void {
    effect(() => {
      const handleEscKey = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && this.hasActiveModals()) {
          const modals = this.activeModals();
          const lastModal = modals[modals.length - 1];
          if (lastModal) {
            this.closeModal(lastModal.type);
          }
        }
      };

      if (this.hasActiveModals()) {
        document.addEventListener('keydown', handleEscKey);
        return () => document.removeEventListener('keydown', handleEscKey);
      }

      return () => {};
    });
  }
}
