import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { 
  AuthModule,
} from '@angular/fire/auth';
import { AuthService } from '../../services/auth.service';

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

  constructor(private authService: AuthService, private router: Router) {}
  
  async register() {

    if (this.password !== this.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    const isRegistered = await this.authService.registerWithEmail(
      this.email, this.password);

    if (isRegistered) {
      alert('Registration successful!');
      this.router.navigate(['/']);
    } else {
      alert('Registration failed!');
    }
  }
}
