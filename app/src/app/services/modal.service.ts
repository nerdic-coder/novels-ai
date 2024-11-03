import { Injectable, ElementRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private platformId = inject(PLATFORM_ID);

  async showModal(modalElement: ElementRef) {
    if (isPlatformBrowser(this.platformId)) {
      const { Modal } = await import('bootstrap');
      const modal = new Modal(modalElement.nativeElement);
      modal.show();
      return modal;
    }
    return null;
  }

  async hideModal(modalElement: ElementRef) {
    if (isPlatformBrowser(this.platformId)) {
      const { Modal } = await import('bootstrap');
      const modal = new Modal(modalElement.nativeElement);
      modal.hide();
      return modal;
    }
    return null;
  }

  async createModal(modalElement: ElementRef) {
    if (isPlatformBrowser(this.platformId)) {
      const { Modal } = await import('bootstrap');
      return new Modal(modalElement.nativeElement);
    }
    return null;
  }
}
