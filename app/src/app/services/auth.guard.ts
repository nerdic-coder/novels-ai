import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): Observable<boolean> {
    return this.authService.isAuthenticatedObservable().pipe(
      take(1), // Only take one value (avoid constant subscription)
      map((isAuthenticated: boolean) => {
        if (!isAuthenticated) {
          this.router.navigate(['/']); // Redirect to login/home if not authenticated
          return false;
        }
        return true;
      })
    );
  }
}