import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth, updatePassword } from '@angular/fire/auth';
import { AuthService } from '../../services/auth.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mt-4">
      <div class="row justify-content-center">
        <div class="col-md-6">
          <div class="card bg-dark text-white">
            <div class="card-header">
              <h4>Change Password</h4>
            </div>
            <div class="card-body">
              <form (ngSubmit)="changePassword()">
                <div class="mb-3">
                  <label for="currentPassword" class="form-label">Current Password</label>
                  <input 
                    id="current-password" 
                    [(ngModel)]="currentPassword" 
                    name="currentPassword" 
                    class="form-control" 
                    type="password" 
                    required>
                </div>
                <div class="mb-3">
                  <label for="newPassword" class="form-label">New Password</label>
                  <input 
                    id="new-password" 
                    [(ngModel)]="newPassword" 
                    name="newPassword" 
                    class="form-control" 
                    type="password" 
                    required>
                </div>
                <div class="mb-3">
                  <label for="confirmPassword" class="form-label">Confirm New Password</label>
                  <input 
                    id="confirm-password" 
                    [(ngModel)]="confirmPassword" 
                    name="confirmPassword" 
                    class="form-control" 
                    type="password" 
                    required>
                </div>
                <div class="d-grid gap-2">
                  <button type="submit" class="btn btn-primary">Change Password</button>
                  <button type="button" class="btn btn-secondary" (click)="cancel()">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ChangePasswordComponent {
  private auth = inject(Auth);
  private authService = inject(AuthService);
  private alertService = inject(AlertService);
  private router = inject(Router);

  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  async changePassword() {
    if (!this.auth.currentUser) {
      this.alertService.error('You must be logged in to change your password');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.alertService.error('New passwords do not match');
      return;
    }

    try {
      // Reauthenticate with current password
      const credential = await this.authService.getEmailCredential(this.auth.currentUser.email!, this.currentPassword);
      await this.authService.reauthenticateWithCredential(credential);
      
      // Change password
      await updatePassword(this.auth.currentUser, this.newPassword);
      
      this.alertService.success('Password changed successfully');
      this.router.navigate(['/novels']);
    } catch (error) {
      console.error('Error changing password:', error);
      this.alertService.error('Failed to change password. Please check your current password.');
    }
  }

  cancel() {
    this.router.navigate(['/novels']);
  }
}
