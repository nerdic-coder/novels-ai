import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  AuthModule,
} from '@angular/fire/auth';
import { AuthService } from '../../services/auth.service';
import { AlertService } from '../../services/alert.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [AuthModule, FormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent {
  
  email: string = '';
  password: string = '';
  confirmPassword: string = '';

  constructor(private authService: AuthService, private router: Router, private alertService: AlertService) {}
  
  async register() {

    if (this.password !== this.confirmPassword) {
      this.alertService.error('Passwords do not match');
      return;
    }

    const isRegistered = await this.authService.registerWithEmail(
      this.email, this.password);

    if (isRegistered) {
      this.alertService.success('Registration successful!');
      this.router.navigate(['/']);
    } else {
      this.alertService.error('Registration failed!');
    }
  }
}
