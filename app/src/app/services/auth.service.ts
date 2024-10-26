import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { 
  Auth, authState, browserLocalPersistence, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithEmailAndPassword, signInWithRedirect, signOut, User 
} from '@angular/fire/auth';
import { setPersistence } from 'firebase/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  user$: Observable<User | null>;
  private auth = inject(Auth);

  constructor(private router: Router) {
    // Subscribe to auth state changes
    this.user$ = authState(this.auth);
    // Redirect based on auth state
    this.user$.subscribe((user) => {
      if (!user) {
        // Not authenticated, redirect to login/home page
        this.router.navigate(['/']);
      } else {
        // Authenticated, redirect to dashboard or logged-in page
        this.router.navigate(['/list']);
      }
    });
  }

  // Optionally define a method to manually check authentication state
  isAuthenticated(): Observable<boolean> {
    return this.user$.pipe(map(user => !!user));
  }

  // Login methods, logout, etc.
  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
      await setPersistence(this.auth, browserLocalPersistence);
      await signInWithRedirect(this.auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  }

  loginWithEmail(email: string, password: string) {

    signInWithEmailAndPassword(this.auth, email, password)
      .then(() => {
        this.router.navigate(['/list']);
      })
      .catch((error: { message: any; }) => {
        console.error(error.message);
        alert('Failed to login!');
      });
  }

  async logout() {
    await signOut(this.auth);
    this.router.navigate(['/']); // Redirect to home page on logout
  }

  async registerWithEmail(email: string, password: string) {
    try {
    await createUserWithEmailAndPassword(this.auth, email, password);
    return true;
    } catch (error) {
      console.log('Error creating user:', error);
      return false;
    }
  }
}