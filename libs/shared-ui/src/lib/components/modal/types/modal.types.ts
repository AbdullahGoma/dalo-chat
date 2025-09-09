export enum ModalType {
  Confirmation = 'confirmation',
}

export interface ModalState {
  readonly type: string;
  readonly data?: any;
  readonly id: string;
}

export interface ModalConfig {
  readonly type: string;
  readonly data?: any;
  readonly disableBackdropClose?: boolean;
  readonly disableEscClose?: boolean;
  readonly customClass?: string;
}

export interface ModalAction {
  readonly text: string;
  readonly handler: () => void;
  readonly style?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  readonly disabled?: boolean;
}

export interface ConfirmationModalData {
  readonly title: string;
  readonly message: string;
  readonly actions: readonly ModalAction[];
}
