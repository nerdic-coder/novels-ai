import { Component, EventEmitter, Output, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-subscription-benefits-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #modalElement class="modal fade" tabindex="-1" aria-labelledby="subscriptionBenefitsModalLabel" aria-hidden="true"
data-bs-theme="dark">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="subscriptionBenefitsModalLabel">Subscribe to Novels AI</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <h6 class="mb-3">For just €6.99/month, you'll get:</h6>
            <ul class="list-group list-group-flush">
              <li class="list-group-item bg-transparent">✨ 20 points every month automatically</li>
              <li class="list-group-item bg-transparent">🚀 Priority access to new features</li>
              <li class="list-group-item bg-transparent">💰 Special subscriber-only discounts</li>
              <li class="list-group-item bg-transparent">🔄 Points roll over - never lose unused points</li>
            </ul>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Maybe later</button>
            <button type="button" class="btn btn-primary" (click)="confirm()">Subscribe Now</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class SubscriptionBenefitsModalComponent {
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