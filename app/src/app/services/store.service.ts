import { inject, Injectable } from '@angular/core';
import { 
  Auth
} from '@angular/fire/auth';
import { Firestore, collection, doc, addDoc, onSnapshot, getDoc } from '@angular/fire/firestore';

declare let gtag: Function;

@Injectable({
  providedIn: 'root',
})
export class StoreService {
  private auth = inject(Auth);
  firestore: Firestore = inject(Firestore);

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
    // event.target.disabled = true;
    // Get the currently signed-in user
    const usersCollection = collection(this.firestore, 'users');
    const currentUserDoc = doc(usersCollection, this.auth.currentUser?.uid);
    const checkoutsCollection = collection(currentUserDoc, 'checkout_sessions');
    const paymentRef = await addDoc(checkoutsCollection, {
      mode: "payment",
      price: "price_1MvLYABPvg43OlrWhK03okqu", // One-time price created in Stripe
      success_url: `https://novels-ai-bff--ai-audiobook.us-central1.hosted.app//novels?success=true`,
      cancel_url: `https://novels-ai-bff--ai-audiobook.us-central1.hosted.app//novels?cancel=true`,
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
        alert('Payment could not be initiated, if error persist contact us!');
        // event.target.disabled = false;
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