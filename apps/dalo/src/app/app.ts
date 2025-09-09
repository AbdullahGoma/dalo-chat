import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ModalService } from 'libs/shared-ui/src/lib/components/modal/modal-service/modal-service';
import { ModalType } from 'libs/shared-ui/src/lib/components/modal/types/modal.types';
import { Modal } from 'libs/shared-ui/src/lib/components/modal/modal';
import { ConfirmationModal } from 'libs/shared-ui/src/lib/components/modal/confirmation-modal/confirmation-modal';

@Component({
  imports: [RouterModule, Modal, ConfirmationModal],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private modalService = inject(ModalService);
  isConfirmationOpen = this.modalService.isModalOpen(ModalType.Confirmation);
}
