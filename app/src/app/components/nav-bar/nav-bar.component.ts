import { Component, ElementRef, inject, OnInit, ViewChild, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  Auth,
  AuthModule,
  signOut,
  sendPasswordResetEmail,
} from '@angular/fire/auth';
import { AuthService } from '../../services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { UpdateContentIfNotGeneratedByServerDirective } from '../../directives/update-content-if-not-generated-by-server.directive';
import { StoreService } from '../../services/store.service';
import { AlertService } from '../../services/alert.service';
import { ConfirmationModalComponent } from '../confirmation-modal/confirmation-modal.component';
import { SubscriptionBenefitsModalComponent } from '../subscription-benefits-modal/subscription-benefits-modal.component';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [FormsModule, AuthModule, CommonModule, RouterModule, UpdateContentIfNotGeneratedByServerDirective, ConfirmationModalComponent, SubscriptionBenefitsModalComponent],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.scss'
})
export class NavBarComponent implements OnInit {
  private auth = inject(Auth);
  
  email: string = '';
  password: string = '';
  resetEmail: string = '';
  isGoogleLoginDisabled: boolean = false;
  paymentInProgress = false;
  googleSignInButtonText: string = 'Google Login';
  isSubscribed = false;
  userEmail: string = '';
  isEmailProvider = false;
  @ViewChild('cancelSubscriptionModal') cancelSubscriptionModal!: ConfirmationModalComponent;
  @ViewChild('subscriptionBenefitsModal') subscriptionBenefitsModal!: SubscriptionBenefitsModalComponent;
  @ViewChild('signinModal') signinModal!: ElementRef;
  @ViewChild('resetPasswordModal') resetPasswordModal!: ElementRef;
  @ViewChild('changePasswordModal') changePasswordModal!: ElementRef;
  @ViewChild('accountDropdown') accountDropdown!: ElementRef;
  @ViewChild('dropdownMenu') dropdownMenu!: ElementRef;
  private dropdownInstance: any;
  private platformId = inject(PLATFORM_ID);

  constructor(
    private authService: AuthService,
    private storeService: StoreService,
    private router: Router,
    private alertService: AlertService,
    private modalService: ModalService,
  ) {
    // Subscribe to auth state changes
    this.auth.onAuthStateChanged(async (user) => {
      if (user) {
        // Reset dropdown instance when user logs in
        this.dropdownInstance = null;
      }
    });
  }

  async ngOnInit() {
    console.log('ngOnInit');
    // Initialize subscription status
    await this.storeService.isSubscribed();
    // Monitor subscription status changes
    this.storeService.subscriptionStatus$.subscribe(status => {
      this.isSubscribed = status;
    });
    
    // Get user email and provider
    const user = this.auth.currentUser;
    if (user) {
      this.userEmail = user.email || '';
      this.isEmailProvider = user.providerData.some(provider => provider.providerId === 'password');
    }

  }

  async ngAfterViewInit() {
    console.log('ngAfterViewInit');
    if (isPlatformBrowser(this.platformId)) {
      // Initialize dropdown after a short delay to ensure DOM is ready
      const { Dropdown } = await import('bootstrap');
      if (this.accountDropdown?.nativeElement) {
        this.dropdownInstance = new Dropdown(this.accountDropdown.nativeElement, {
          autoClose: true
        });
      }
    }
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  checkSubscribed(): Promise<boolean> {
    return this.storeService.isSubscribed();
  }

  async emailLogin() {
    const success = await this.authService.loginWithEmail(this.email, this.password);
    if (success) {
      this.email = '';
      this.password = '';
      this.resetEmail = '';
      this.router.navigate(['/novels']);
    } else {
      this.alertService.error('Failed to login');
    }
  }

  async googleLogin() {
    try {
      this.isGoogleLoginDisabled = true;
      this.googleSignInButtonText = 'Loading...';
      await this.authService.loginWithGoogle();
    } catch (error) {
      console.error('Error signing in', error);
      this.alertService.error('Error signing in!');
    } finally {
      this.isGoogleLoginDisabled = false;
      this.googleSignInButtonText = 'Google Login';
    }
  }

  closeDropdown() {
    if (this.dropdownInstance) {
      this.dropdownInstance.hide();
    }
  }

  async logout(dropdownToggle: HTMLElement) {

    await signOut(this.auth);
    this.router.navigate(['/']);
  }

  async buyPoints() {
    this.paymentInProgress = true;
    const success = await this.storeService.buyPoints();
    if (!success) {
      this.paymentInProgress = false;
    }
  }

  async subscribe() {
    this.subscriptionBenefitsModal.confirmed.subscribe(async () => {
      this.paymentInProgress = true;
      const success = await this.storeService.startSubscription();
      if (!success) {
        this.paymentInProgress = false;
      }
    });
    this.subscriptionBenefitsModal.show();
  }

  async cancelSubscription() {
    this.cancelSubscriptionModal.message = "Are you sure you want to cancel your subscription?";
    this.cancelSubscriptionModal.confirmed.subscribe(async () => {
      this.paymentInProgress = true;
      const success = await this.storeService.cancelSubscription();
      if (!success) {
        this.paymentInProgress = false;
      }
    });
    this.cancelSubscriptionModal.show();
  }

  async openResetPasswordModal() {
    // Hide the sign-in modal, then show the reset password modal
    await this.modalService.hideModal(this.signinModal);
    this.modalService.showModal(this.resetPasswordModal);
  }


  async toggleAccountDropdown() {
    if (isPlatformBrowser(this.platformId)) {
      // Always create a new instance when toggling
      const { Dropdown } = await import('bootstrap');
      if (this.accountDropdown?.nativeElement) {
        // Dispose of existing instance if it exists
        if (this.dropdownInstance) {
          this.dropdownInstance.dispose();
        }
        this.dropdownInstance = new Dropdown(this.accountDropdown.nativeElement, {
          autoClose: true
        });
      }
    }

    if (this.dropdownInstance) {
      // Get user email and provider
      const user = this.auth.currentUser;
      if (user) {
        this.userEmail = user.email || '';
        this.isEmailProvider = user.providerData.some(provider => provider.providerId === 'password');
      }
      this.dropdownInstance.toggle();
    }
  }

  async resetPassword() {
    if (!this.resetEmail) {
      this.alertService.error('Please enter an email address!');
      console.error('Please enter an email address');
      return;
    }
    try {
      await sendPasswordResetEmail(this.auth, this.resetEmail);
      console.log('Password reset email sent');
      this.alertService.info('Password reset email sent!');
      
      this.email = '';
      this.password = '';
      this.resetEmail = '';
    } catch (error) {
      console.error('Error sending password reset email:', error);
      this.alertService.error('Error sending password reset email!');
    }
  }
}
