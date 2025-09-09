import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { ModalService } from '../modal-service/modal-service';

@Component({
  selector: 'lib-modal-base',
  imports: [],
  templateUrl: './modal-base.html',
  styleUrl: './modal-base.css',
})
export abstract class ModalBase implements OnInit, OnDestroy {
  protected readonly modalService = inject(ModalService);

  @ViewChild('modalTemplate', { static: true })
  modalTemplate!: TemplateRef<any>;

  abstract readonly modalType: string;

  ngOnInit(): void {
    this.modalService.registerModalTemplate(this.modalType, this.modalTemplate);
  }

  ngOnDestroy(): void {
    this.modalService.unregisterModalTemplate(this.modalType);
  }

  protected closeModal(): void {
    this.modalService.closeModal(this.modalType);
  }
}
