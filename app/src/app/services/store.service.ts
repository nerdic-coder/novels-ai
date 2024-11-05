import { inject, Injectable } from '@angular/core';
import { 
  Auth
} from '@angular/fire/auth';
import { Firestore, collection, doc, addDoc, onSnapshot, getDoc, query, where, getDocs } from '@angular/fire/firestore';
import { getFunctions, httpsCallable } from '@angular/fire/functions';
import { environment } from '../../environments/environment';
import { AlertService } from './alert.service';

declare let gtag: Function;

@Injectable({
  providedIn: 'root',
})
export class StoreService {
  private auth = inject(Auth);
  firestore: Firestore = inject(Firestore);
  alertService = inject(AlertService);

  async isSubscribed(): Promise<boolean> {
    const uid = this.auth.currentUser?.uid;
    if (!uid) return false;

    const subscriptionsRef = collection(this.firestore, 'customers', uid, 'subscriptions');
    const q = query(subscriptionsRef, where('status', 'in', ['trialing', 'active']));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }

  async cancelSubscription() {
    const uid = this.auth.currentUser?.uid;
    if (!uid) {
      this.alertService.error('You must be logged in to cancel your subscription');
      return;
    }

    try {
      const subscriptionsRef = collection(this.firestore, 'customers', uid, 'subscriptions');
      const q = query(subscriptionsRef, where('status', 'in', ['trialing', 'active']));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        this.alertService.error('No active subscription found');
        return;
      }

      const portalSession = await this.createPortalSession();
      window.location.href = portalSession.url;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      this.alertService.error('Failed to cancel subscription. Please try again.');
    }
  }

  private async createPortalSession(): Promise<{ url: string }> {
    const functionRef = httpsCallable<{ returnUrl: string }, { url: string }>(
      getFunctions(),
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

  async buyPoints() {
    const usersCollection = collection(this.firestore, 'users');
    const currentUserDoc = doc(usersCollection, this.auth.currentUser?.uid);
    const checkoutsCollection = collection(currentUserDoc, 'checkout_sessions');
    const paymentRef = await addDoc(checkoutsCollection, {
      mode: "payment",
      price: "price_1MvLYABPvg43OlrWhK03okqu", // One-time price created in Stripe
      success_url: `${window.location.origin}/novels?success=true`,
      cancel_url: `${window.location.origin}/novels?cancel=true`,
    });

    // Listen for changes to the document
    onSnapshot(paymentRef, (doc: any) => {
      // Check if the URL field exists and is not null
      if (doc.exists && doc.data().url) {
        const url = doc.data().url;
        // event.target.disabled = false;
        gtag('event', 'begin_checkout', {
          'event_category': 'Checkout',
          'event_label': 'Start of Checkout',
          'value': 5,
        });
        // Do something with the URL, e.g. open it in a new window
        window.location.href = url;
      } else if (doc.exists && doc.data().error) {
        this.alertService.error('Payment could not be initiated, if error persist contact us!');
      }
    });
  }

  async startSubscription() {
    const usersCollection = collection(this.firestore, 'users');
    const currentUserDoc = doc(usersCollection, this.auth.currentUser?.uid);
    const checkoutsCollection = collection(currentUserDoc, 'checkout_sessions');
    const subscriptionRef = await addDoc(checkoutsCollection, {
      mode: "subscription",
      price: environment.SUBSCRIPTION_PRICE_ID,
      success_url: `${window.location.origin}/novels?subscription=success`,
      cancel_url: `${window.location.origin}/novels?subscription=cancel`,
    });

    console.log('checkout', subscriptionRef);

    onSnapshot(subscriptionRef, (doc: any) => {
      if (doc.exists && doc.data().url) {
        window.location.href = doc.data().url;
      } else if (doc.exists && doc.data().error) {
        this.alertService.error('Payment could not be initiated, if error persist contact us!');
      }
    });
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
