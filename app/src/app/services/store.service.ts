import { inject, Injectable } from '@angular/core';
import { 
  Auth
} from '@angular/fire/auth';
import { BehaviorSubject } from 'rxjs';
import { Firestore, collection, doc, addDoc, onSnapshot, getDoc, query, where, getDocs } from '@angular/fire/firestore';
import { getFunctions, httpsCallable } from '@angular/fire/functions';
import { environment } from '../../environments/environment.loader';
import { AlertService } from './alert.service';

declare let gtag: Function;

@Injectable({
  providedIn: 'root',
})
export class StoreService {
  private auth = inject(Auth);
  firestore: Firestore = inject(Firestore);
  alertService = inject(AlertService);

  private subscriptionStatusSubject = new BehaviorSubject<boolean>(false);
  subscriptionStatus$ = this.subscriptionStatusSubject.asObservable();

  async isSubscribed(): Promise<boolean> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      this.subscriptionStatusSubject.next(false);
      return false;
    }

    const subscriptionsRef = collection(this.firestore, 'users', uid, 'subscriptions');
    const q = query(subscriptionsRef, where('status', 'in', ['trialing', 'active']));
    const snapshot = await getDocs(q);
    const isSubscribed = !snapshot.empty;
    this.subscriptionStatusSubject.next(isSubscribed);
    return isSubscribed;
  }

  async cancelSubscription(): Promise<boolean> {
    this.alertService.error('Due to the service shutting down, you can no longer manage your subscription.');
    return false;
  }

  private async createPortalSession(): Promise<{ url: string }> {
    const functionRef = httpsCallable<{ returnUrl: string }, { url: string }>(
      getFunctions(undefined, 'europe-west2'),
      'ext-firestore-stripe-payments-createPortalLink'
    );
    const { data } = await functionRef({
      returnUrl: window.location.origin + '/novels',
    });
    return data;
  }

  isSuccessOrderParamPresent() {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    // Modify the condition based on the specific parameters you're checking for
    if (success) {
      if (typeof gtag !== 'undefined') {
        gtag('event', 'conversion', {
            'send_to': 'AW-987087034/PhTWCPKdl80YELqB19YD',
            'transaction_id': ''
        });
      }
    }
  }

  async buyPoints(): Promise<boolean> {
    try {
      const usersCollection = collection(this.firestore, 'users');
      const currentUserDoc = doc(usersCollection, this.auth.currentUser?.uid);
      const checkoutsCollection = collection(currentUserDoc, 'checkout_sessions');
      const paymentRef = await addDoc(checkoutsCollection, {
        mode: "payment",
        price: environment.POINTS_PRICE_ID,
        success_url: `${window.location.origin}/novels?success=true`,
        cancel_url: `${window.location.origin}/novels?cancel=true`,
      });

      return new Promise((resolve) => {
        onSnapshot(paymentRef, (doc: any) => {
          if (doc.exists && doc.data().url) {
            const url = doc.data().url;
            gtag('event', 'begin_checkout', {
              'event_category': 'Checkout',
              'event_label': 'Start of Checkout',
              'value': 5,
            });
            window.location.href = url;
            resolve(true);
          } else if (doc.exists && doc.data().error) {
            this.alertService.error('Payment could not be initiated, if error persist contact us!');
            resolve(false);
          }
        });
      });
    } catch (error) {
      this.alertService.error('Payment could not be initiated, please try again!');
      return false;
    }
  }

  async startSubscription(): Promise<boolean> {
    this.alertService.error('Due to the service shutting down, you can no longer start a new subscription.');
    return false;
  }

  async getPoints(): Promise<number> {
    try {
      // Reference to the user's document
      const usersCollection = collection(this.firestore, 'users');
      const currentUserDoc = doc(usersCollection, this.auth.currentUser?.uid);
  
      // Get a single snapshot of the user's document
      const docSnapshot = await getDoc(currentUserDoc);
  
      if (docSnapshot.exists()) {
        // Retrieve the points or set to a default value if undefined
        const points = docSnapshot.data()['points'] ?? 2;
        return points;
      } else {
        throw new Error("User document does not exist");
      }
    } catch (error) {
      console.error(`Error getting user document: ${error}`);
      return 0;  // Default value if there's an error
    }
  }
}
