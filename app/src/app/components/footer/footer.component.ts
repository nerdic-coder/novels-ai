import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import {
  User,
} from '@angular/fire/auth';
import { AuthService } from '../../services/auth.service';
import { UpdateContentIfNotGeneratedByServerDirective } from '../../directives/update-content-if-not-generated-by-server.directive';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule, UpdateContentIfNotGeneratedByServerDirective],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {

  user$: Observable<User | null>;

  constructor(private authService: AuthService) {
    this.user$ = this.authService.user$;
  }
}
