import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { 
  Auth,
  authState,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signOut,
  signInWithEmailAndPassword,
  signInWithRedirect, 
} from '@angular/fire/auth';
import { setPersistence } from 'firebase/auth';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly serviceShutDown = true;

  private auth = inject(Auth);
  private router = inject(Router);

  constructor() {
    // Only check redirect result if the user is not already authenticated
    authState(this.auth).subscribe(async (user) => {
      if (!user) {
        await this.handleRedirectResult();
      }
    });
    
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        if (this.serviceShutDown) {
          signOut(this.auth);
          this.router.navigate(['/']);
          return;
        }
        this.router.navigate(['/novels']);
      } else {
        // Handle user logout (e.g., clear user-specific data)
      }
    });
  }

  private async handleRedirectResult() {
    try {
      const result = await getRedirectResult(this.auth);
      if (result) {
        this.router.navigate(['/novels']);
      }
    } catch (error) {
      console.error("Error handling redirect result", error);
    }
  }

  // Optionally define a method to manually check authentication state
  isAuthenticated(): boolean {
    return this.auth.currentUser !== null;
  }

  isAuthenticatedObservable(): Observable<boolean> {
    return authState(this.auth).pipe(map(user => !!user));
  }

  // Login methods, logout, etc.
  async loginWithGoogle() {
    if (this.serviceShutDown) {
      console.info('Login disabled while service is shut down.');
      return;
    }

    const provider = new GoogleAuthProvider();
    try {
      await setPersistence(this.auth, browserLocalPersistence);
      await signInWithRedirect(this.auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  }

  async getEmailCredential(email: string, password: string) {
    const { EmailAuthProvider } = await import('firebase/auth');
    return EmailAuthProvider.credential(email, password);
  }

  async reauthenticateWithCredential(credential: any) {
    if (!this.auth.currentUser) {
      throw new Error('No user is currently signed in');
    }
    return reauthenticateWithCredential(this.auth.currentUser, credential);
  }

  async loginWithEmail(email: string, password: string) {
    if (this.serviceShutDown) {
      console.info('Login disabled while service is shut down.');
      return false;
    }

    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }


}
