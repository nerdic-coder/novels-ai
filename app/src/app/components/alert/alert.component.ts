import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AlertService, Alert } from '../../services/alert.service';

@Component({
  selector: 'app-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (currentAlert) {
      <div
        class="alert alert-{{currentAlert.type}} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-2"
        role="alert"
        style="z-index: 1050;"
        [innerHTML]="currentAlert.message">
        <button type="button" class="btn-close" (click)="clearAlert()" aria-label="Close"></button>
      </div>
    }
  `
})
export class AlertComponent implements OnInit, OnDestroy {
  currentAlert: Alert | null = null;
  private subscription: Subscription | null = null;
  private timeout: any;

  constructor(private alertService: AlertService) {}

  ngOnInit() {
    this.subscription = this.alertService.alert$.subscribe(alert => {
      this.currentAlert = alert;
      if (alert.timeout) {
        if (this.timeout) {
          clearTimeout(this.timeout);
        }
        this.timeout = setTimeout(() => {
          this.clearAlert();
        }, alert.timeout);
      }
    });
  }

  clearAlert() {
    this.currentAlert = null;
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }
}
