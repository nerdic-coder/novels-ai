import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { 
  Auth, authState, browserLocalPersistence, connectAuthEmulator, createUserWithEmailAndPassword, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithRedirect, 
} from '@angular/fire/auth';
import { setPersistence } from 'firebase/auth';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private auth = inject(Auth);
  private router = inject(Router);

  constructor() {
    // connectAuthEmulator(this.auth, "http://127.0.0.1:9099", { disableWarnings: true });
    onAuthStateChanged(this.auth, (user) => {
      // this.userSubject.next(user); // Emits user state across the app
      if (user) {
        console.log('Logged in', user);
        this.router.navigate(['/novels']);
        // Handle logged-in user (e.g., fetch user data or update UI)
      } else {
        // Handle user logout (e.g., clear user-specific data)
      }
    });
  }

  ngOnInit() {
    getRedirectResult(this.auth)
      .then((result) => {
        if (result) {
          // Handle the logged-in user here, like storing user info or redirecting
          console.log("Login successful", result.user);
          this.router.navigate(['/novels']);
        }
      })
      .catch((error) => {
        console.error("Error handling redirect result", error);
      });
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
    const provider = new GoogleAuthProvider();
    try {
      await setPersistence(this.auth, browserLocalPersistence);
      await signInWithRedirect(this.auth, provider);
    } catch (error) {
      console.error('Login error:', error);
    }
  }

  async loginWithEmail(email: string, password: string) {
    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
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
