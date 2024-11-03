import { Component, EventEmitter, Input, Output, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #modalElement class="modal fade" tabindex="-1" aria-labelledby="confirmationModalLabel" aria-hidden="true" data-bs-theme="dark">
       <div class="modal-dialog">
         <div class="modal-content">
           <div class="modal-header">
             <h5 class="modal-title" id="confirmationModalLabel">{{ title }}</h5>
             <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
           </div>
           <div class="modal-body">
             {{ message }}
           </div>
           <div class="modal-footer">
             <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
             <button type="button" class="btn btn-primary" (click)="confirm()">Confirm</button>
           </div>
         </div>
       </div>
     </div>
   `
 })
 export class ConfirmationModalComponent {
   @Input() title: string = 'Confirm Action';
   @Input() message: string = 'Are you sure you want to proceed?';
   @Output() confirmed = new EventEmitter<void>();

  @ViewChild('modalElement') modalElement!: ElementRef;
  private modalService = inject(ModalService);
  private modalInstance: any = null;

  async ngAfterViewInit() {
    this.modalInstance = await this.modalService.createModal(this.modalElement);
  }

  async show() {
    if (!this.modalInstance) {
      this.modalInstance = await this.modalService.showModal(this.modalElement);
    } else {
      this.modalInstance?.show();
    }
  }

  async hide() {
    if (!this.modalInstance) {
      this.modalInstance = await this.modalService.hideModal(this.modalElement);
    } else {
      this.modalInstance?.hide();
    }
  }

   confirm() {
     this.confirmed.emit();
     this.hide();
   }
 }
