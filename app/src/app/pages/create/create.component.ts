import { Component, inject } from '@angular/core';
import { AudiobookRequest, narrationTypes, voices } from '../../models/audiobook';
import { 
  Auth
} from '@angular/fire/auth';
import { 
  Firestore, 
  collection, 
  doc,
  onSnapshot,
} from '@angular/fire/firestore';
import { environment } from '../../../environments/environment';
import { StoreService } from '../../services/store.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss'
})
export class CreateComponent {
  private auth = inject(Auth);
  firestore: Firestore = inject(Firestore);
  points = 0;
  paymentInProgress = false;
  creationInProgress = false;

  voicesArray = Array.from(voices.entries());
  narrationTypesArray  = Array.from(narrationTypes.entries());

  title: string = '';
  genre: string = '';
  style: string = '';
  plot: string = '';
  pov: string = '';
  selectedVoice = 'onyx'; // Default selected value, change this based on your logic
  starring: string = '';
  imageInput: any;

  constructor(private storeService: StoreService, private router: Router, private authService: AuthService) {
    
    const usersCollection = collection(this.firestore, 'users');
    const currentUserDoc = doc(usersCollection, this.auth.currentUser?.uid);
    // Subscribe to real-time updates on the user's document
    onSnapshot(currentUserDoc, (doc: any) => {
      if (doc.exists) {
        let points = doc.data().points;
        if (points === undefined) {
            points = 2;
        }
        this.points = points;
      }
    }, (error) => {
      console.error(`Error getting user document: ${error}`);
      // document.getElementById('point-indicator').textContent = NEW_USER_POINTS;
    });
  }

  async buyPoints() {
    this.paymentInProgress = true;
    await this.storeService.buyPoints();
    this.paymentInProgress = false;
  }

  // Helper function to handle the POST request
  async postData(token: string | undefined, formData: any) {
    // POST request
    const response = await fetch(environment.API_URL_GENERATE_NEW_NOVEL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });
    
    const data = await response.text();

    // Re-enable the submit button
    this.creationInProgress = false;

    if (data === 'Unauthorized') {
      alert('Your session has expired!');
      this.authService.logout();
    } else {
      this.router.navigate(['/list']);
    }
  }

  onFileSelected(event: Event) {
    const fileInput = event.target as HTMLInputElement;

    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();

      reader.readAsDataURL(file); // Read the file as a base64 encoded string
      
      reader.onload = async () => {
        this.imageInput = reader.result as string; // Ensure reader.result is a string
      };
    }
  }

  async generateAudiobook() {
    
    // Disable submit button
    this.creationInProgress = true;
    
    try {
      const token = await this.auth.currentUser?.getIdToken();
    
      // Gather form data
      const formData: AudiobookRequest = {
        voice: this.selectedVoice,
        pov: this.pov,
        genre: this.genre,
        title: this.title,
        style: this.style,
        plot: this.plot,
        starring: this.starring,
        image: this.imageInput ? this.imageInput : null
      };
    
      await this.postData(token, formData);
    
    } catch (error) {
      console.error(error);
      alert('Creating novel failed, please try again!');
    
      // Re-enable the submit button
      this.creationInProgress = false;
    }
  }
}
