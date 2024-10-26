import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  AuthModule,
  User,
} from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { RouterModule } from '@angular/router';
import { UpdateContentIfNotGeneratedByServerDirective } from '../../directives/update-content-if-not-generated-by-server.directive';

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [FormsModule, AuthModule, CommonModule, RouterModule, UpdateContentIfNotGeneratedByServerDirective],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.scss'
})
export class NavBarComponent {

  user$: Observable<User | null>;

  email: string = '';
  password: string = '';
  isGoogleLoginDisabled: boolean = false;
  googleSignInButtonText: string = 'Google Login';

  constructor(private authService: AuthService) {
    this.user$ = this.authService.user$;
  }

  emailLogin() {
    this.authService.loginWithEmail(this.email, this.password);
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
        alert('Error signing in!');
        this.isGoogleLoginDisabled = false;
        this.googleSignInButtonText = 'Google Login';
    }
  }

  logout() {
    this.authService.logout();
  }

}
