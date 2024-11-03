import { Injectable, ElementRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class OffcanvasService {
  private platformId = inject(PLATFORM_ID);

  async showOffcanvas(element: ElementRef) {
    if (isPlatformBrowser(this.platformId)) {
      const { Offcanvas } = await import('bootstrap');
      const offcanvas = new Offcanvas(element.nativeElement);
      offcanvas.show();
      return offcanvas;
    }
    return null;
  }

  async hideOffcanvas(element: ElementRef) {
    if (isPlatformBrowser(this.platformId)) {
      const { Offcanvas } = await import('bootstrap');
      const offcanvas = new Offcanvas(element.nativeElement);
      offcanvas.hide();
      return offcanvas;
    }
    return null;
  }

  async createOffcanvas(element: ElementRef) {
    if (isPlatformBrowser(this.platformId)) {
      const { Offcanvas } = await import('bootstrap');
      return new Offcanvas(element.nativeElement);
    }
    return null;
  }
}
