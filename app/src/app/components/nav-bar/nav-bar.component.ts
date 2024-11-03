import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  Auth,
  AuthModule,
  signOut,
} from '@angular/fire/auth';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { UpdateContentIfNotGeneratedByServerDirective } from '../../directives/update-content-if-not-generated-by-server.directive';
import { StoreService } from '../../services/store.service';
import { AlertService } from '../../services/alert.service';
import { ConfirmationModalComponent } from '../confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [FormsModule, AuthModule, CommonModule, RouterModule, UpdateContentIfNotGeneratedByServerDirective, ConfirmationModalComponent],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.scss'
})
export class NavBarComponent implements OnInit {
  private auth = inject(Auth);

  email: string = '';
  password: string = '';
  isGoogleLoginDisabled: boolean = false;
  paymentInProgress = false;
  googleSignInButtonText: string = 'Google Login';
  isSubscribed = false;
  @ViewChild('cancelSubscriptionModal') cancelSubscriptionModal!: ConfirmationModalComponent;

  constructor(
    private authService: AuthService,
    private storeService: StoreService,
    private router: Router,
    private alertService: AlertService,
  ) {}

  async ngOnInit() {
    // Check subscription status when component initializes
    this.isSubscribed = await this.storeService.isSubscribed();
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  async emailLogin() {
    const success = await this.authService.loginWithEmail(this.email, this.password);
    if (success) {
      this.router.navigate(['/novels']);
    } else {
      this.alertService.error('Failed to login');
    }
  }

  async googleLogin() {
    try {
      // Disable the button and change the text
      this.isGoogleLoginDisabled = true;
      this.googleSignInButtonText = 'Loading...';
      await this.authService.loginWithGoogle();
      this.isGoogleLoginDisabled = false;
      this.googleSignInButtonText = 'Google Login';
    } catch (error) {
        console.error('Error signing in', error);
        this.alertService.error('Error signing in!');
        this.isGoogleLoginDisabled = false;
        this.googleSignInButtonText = 'Google Login';
    }
  }

  async logout() {
    await signOut(this.auth);
    this.router.navigate(['/']);
  }

  async buyPoints() {
    this.paymentInProgress = true;
    await this.storeService.buyPoints();
    this.paymentInProgress = false;
  }

  async subscribe() {
    this.paymentInProgress = true;
    await this.storeService.startSubscription();
    this.paymentInProgress = false;
  }

  async cancelSubscription() {
    this.cancelSubscriptionModal.message = "Are you sure you want to cancel your subscription?";
    this.cancelSubscriptionModal.confirmed.subscribe(async () => {
      this.paymentInProgress = true;
      await this.storeService.cancelSubscription();
      this.paymentInProgress = false;
    });
    this.cancelSubscriptionModal.show();
  }

}
