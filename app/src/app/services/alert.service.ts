import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Alert {
  type: 'success' | 'danger' | 'warning' | 'info';
  message: string;
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

  success(message: string, timeout = 15000) {
    this.show({ type: 'success', message, timeout });
  }

  error(message: string, timeout = 15000) {
    this.show({ type: 'danger', message, timeout });
  }

  warning(message: string, timeout = 4000) {
    this.show({ type: 'warning', message, timeout });
  }

  info(message: string, timeout = 3000) {
    this.show({ type: 'info', message, timeout });
  }
}