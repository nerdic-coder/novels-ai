import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { UpdateContentIfNotGeneratedByServerDirective } from '../../directives/update-content-if-not-generated-by-server.directive';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, UpdateContentIfNotGeneratedByServerDirective],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  private auth = inject(Auth);

  constructor(private authService: AuthService) {
  }

  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }
}
