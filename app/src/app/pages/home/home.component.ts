import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExternalLinkDirective } from '../../directives/external-link.directive';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ExternalLinkDirective],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  host: {
    'class': 'content'
  }
})
export class HomeComponent {

}
