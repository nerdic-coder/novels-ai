import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { 
  Auth
} from '@angular/fire/auth';
import { 
  Firestore, 
  collection, 
  collectionData, 
  doc,
  orderBy,
  query,
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './payment-history.component.html',
  styleUrl: './payment-history.component.scss'
})
export class PaymentHistoryComponent {
  private auth = inject(Auth);
  firestore: Firestore = inject(Firestore);
  payments$ = new Observable<any[]>();

  constructor() {
    // Get the currently signed-in user
    let user = this.auth.currentUser;
    const usersCollection = collection(this.firestore, 'users');
    const currentUserDoc = doc(usersCollection, this.auth.currentUser?.uid);
    const orderByCreated = orderBy('created', 'desc');
    const paymentCollection = collection(currentUserDoc, 'payments');
    const queryPayments = query(paymentCollection, orderByCreated);
    this.payments$ = collectionData<any> (queryPayments);
  }

  formatDate(date: number): string {
    return new Date(date * 1000).toLocaleString();
  }
}
