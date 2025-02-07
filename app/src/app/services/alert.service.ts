import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { SafeHtml } from '@angular/platform-browser';

export interface Alert {
  type: 'success' | 'danger' | 'warning' | 'info';
  message: string | SafeHtml;
  timeout?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private alertSubject = new Subject<Alert>();
  alert$ = this.alertSubject.asObservable();

  show(alert: Alert) {
    this.alertSubject.next(alert);
  }

  success(message: string | SafeHtml, timeout = 30000) {
    this.show({ type: 'success', message, timeout });
  }

  error(message: string | SafeHtml, timeout = 15000) {
    this.show({ type: 'danger', message, timeout });
  }

  warning(message: string | SafeHtml, timeout = 4000) {
    this.show({ type: 'warning', message, timeout });
  }

  info(message: string | SafeHtml, timeout = 3000) {
    this.show({ type: 'info', message, timeout });
  }
}
