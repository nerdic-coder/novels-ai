import { Component, ElementRef, inject, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { OffcanvasService } from '../../services/offcanvas.service';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { 
  Auth,
  signOut
} from '@angular/fire/auth';
import { 
  Firestore, 
  collection, 
  doc, 
  orderBy, 
  limit, 
  query, 
  collectionData, 
  CollectionReference,
  onSnapshot,
  startAfter,
} from '@angular/fire/firestore';
import { environment } from '../../../environments/environment.loader';
import { Audiobook, Chapter, narrationTypes, Voice, voices } from '../../models/audiobook';
import { StoreService } from '../../services/store.service';
import { AudiobookExportOptions, AudioService } from '../../services/audio.service';
import { AlertService } from '../../services/alert.service';
import { ConfirmationModalComponent } from '../../components/confirmation-modal/confirmation-modal.component';
import { SubscriptionBenefitsModalComponent } from '../../components/subscription-benefits-modal/subscription-benefits-modal.component';

@Component({
  selector: 'app-novels',
  standalone: true,
  imports: [CommonModule, RouterModule, ConfirmationModalComponent, SubscriptionBenefitsModalComponent],
  templateUrl: './novels.component.html',
  styleUrl: './novels.component.scss'
})
export class NovelsComponent implements OnInit, AfterViewInit {
  private auth = inject(Auth);
  private storiesShown = environment.STORIES_PER_PAGE;
  private audiobooksRef;
  private offcanvasService = inject(OffcanvasService);
  private offcanvasInstance: any = null;
  firestore: Firestore = inject(Firestore);
  lastVisibleDocument: any = null;  // Track the last document in the previous query
  audiobooks: Audiobook[] = [];
  audiobooks$ = new BehaviorSubject<Audiobook[]>([]);
  canLoadMore = true;
  paymentInProgress = false;
  points = 0;
  selectedAudiobook: Audiobook | null = null;
  @ViewChild('offcanvasElement') offcanvasElement!: ElementRef;
  @ViewChild('cancelSubscriptionModal') cancelSubscriptionModal!: ConfirmationModalComponent;
  @ViewChild('deleteModal') deleteModal!: ConfirmationModalComponent;
  @ViewChild('subscriptionBenefitsModal') subscriptionBenefitsModal!: SubscriptionBenefitsModalComponent;
  @ViewChild('addChapterModal') addChapterModal!: ConfirmationModalComponent;
  isSubscribed = false;

  constructor(
    private storeService: StoreService, 
    private router: Router, 
    private audioService: AudioService, 
    private alertService: AlertService,
    private route: ActivatedRoute,
  ) {
    // Get the audiobooks collection for the current user
    const usersCollection = collection(this.firestore, 'users');
    const currentUserDoc = doc(usersCollection, this.auth.currentUser?.uid);
    this.audiobooksRef = collection(currentUserDoc, 'audiobooks') as CollectionReference<Audiobook>;
    this.loadNovels();

    // Real-time listener for changes in the audiobooks collection
    onSnapshot(this.audiobooksRef, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        const changedAudiobook = change.doc.data() as Audiobook;
        changedAudiobook.id = change.doc.id; // Assign the document ID
        if (change.type === 'modified') {
          // Update existing audiobook
          const index = this.audiobooks.findIndex(audiobook => audiobook.id === changedAudiobook.id);
          if (index !== -1) {
            this.audiobooks[index] = changedAudiobook;
          }
        } else if (change.type === 'removed') {
          // Remove deleted audiobook
          this.audiobooks = this.audiobooks.filter(audiobook => audiobook.id !== changedAudiobook.id);
        }

        // Emit the updated array to the audiobooks$ observable
        this.audiobooks$.next(this.audiobooks);
      });
    });

    // Subscribe to real-time updates on the user's document
    onSnapshot(currentUserDoc, (doc: any) => {
      if (doc.exists()) {
        const data = doc.data();
        let points = data?.points;
        if (points === undefined) {
            points = 2;
        }
        this.points = points;
      }
    }, (error) => {
      console.error(`Error getting user document: ${error}`);
    });
  }

  async ngOnInit() {
    
    // Check subscription status when component initializes
    this.isSubscribed = await this.storeService.isSubscribed();

    // Check URL parameters for purchase/subscription status
    this.route.queryParams.subscribe(params => {
      if (params['success'] === 'true') {
        this.alertService.success('Payment successful! Your points have been added.');
      }
      if (params['cancel'] === 'true') {
        this.alertService.warning('Payment cancelled.');
      }
      if (params['subscription'] === 'success') {
        this.alertService.success('Subscription activated! You now have access to 20 points monthly.');
      }
      if (params['subscription'] === 'cancel') {
        this.alertService.warning('Subscription cancelled.');
      }
    });
  }

  async loadNovels() {
    try {
      // Listen for changes to the audiobooks collection
      const orderByAudiobook = orderBy('createdDate', 'desc');
      const limitAudiobook = limit(environment.STORIES_PER_PAGE);
      // Build the query: fetch new audiobooks starting after the last visible document
      let queryAudiobook;
      if (this.lastVisibleDocument) {
        // If there's a last visible document, start after it
        queryAudiobook = query(this.audiobooksRef, orderByAudiobook, startAfter(this.lastVisibleDocument), limitAudiobook);
      } else {
        // Initial load, no need to use startAfter
        queryAudiobook = query(this.audiobooksRef, orderByAudiobook, limitAudiobook);
      }

      // Await the data using a Promise
      const newAudiobooks = await firstValueFrom(collectionData<Audiobook>(queryAudiobook, { idField: 'id' }));
      
      if (newAudiobooks.length > 0) {
        // Update the last visible document
        this.lastVisibleDocument = newAudiobooks[newAudiobooks.length - 1].createdDate;

        // Append new audiobooks to the array and emit updated data
        this.audiobooks.push(...newAudiobooks);
        this.audiobooks$.next(this.audiobooks);

        // Update the flag based on the results
        this.canLoadMore = newAudiobooks.length >= environment.STORIES_PER_PAGE;
      } else {
        this.canLoadMore = false;
      }
    } catch (error) {
      console.error('Error loading novels:', error);
    }
  }

  async ngAfterViewInit() {
    this.offcanvasInstance = await this.offcanvasService.createOffcanvas(this.offcanvasElement);
  }

  async openAudiobookDetails(audiobook: Audiobook) {
    this.selectedAudiobook = audiobook;
    if (!this.offcanvasInstance) {
      this.offcanvasInstance = await this.offcanvasService.showOffcanvas(this.offcanvasElement);
    } else {
      this.offcanvasInstance.show();
    }
  }

  playChapter(novel: Audiobook, chapter: Chapter) {
    this.audioService.playChapter(novel, chapter);
  }

  onPlayPauseChapter(novel: Audiobook, chapter: Chapter) {
    if (this.isPlayingCurrentChapter(novel, chapter)) {
      // If it's the current chapter, toggle play/pause
      this.audioService.updatePlayingState(false);
    } else {
      // Play the new chapter
      this.audioService.playChapter(novel, chapter);
    }
  }

  isPlayingCurrentChapter(novel: Audiobook, chapter: Chapter): boolean {
    const isPlaying = this.audioService.isCurrentChapter(novel, chapter) && this.audioService.isPlaying();
    return isPlaying;
  }

  loadMoreNovels() {
    this.storiesShown += environment.STORIES_PER_PAGE;
    this.loadNovels();
  }

  getNarrationType(pov: string | undefined): string | undefined {
    return pov ? narrationTypes.get(pov) : undefined;
  }

  getVoice(voice: string | undefined): Voice | undefined {
    return voice ? voices.get(voice) : undefined;
  }

  async deleteAudiobook(audiobookId: string) {
    this.deleteModal.message = "Are you sure you want to delete this book?";
    this.deleteModal.confirmed.subscribe(async () => {
      const requestBody = new URLSearchParams();
      requestBody.append('audiobookId', audiobookId);

      const token = await this.auth.currentUser?.getIdToken();
      fetch(environment.API_URL_REMOVE_NOVEL, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: requestBody.toString(),
      })
      .then(response => response.text())
      .then(async data => {
          if (data === 'Unauthorized') {
            this.alertService.error('Your session have expired!');
            await signOut(this.auth);
            this.router.navigate(['/']);
          } else if (data === 'Internal Server Error') {
            this.alertService.error('Deleting Audiobook failed, please try again!');
          }
      })
      .catch(error => {
          console.error(error);
          this.alertService.error('Deleting Audiobook failed, please try again!');
      });
    });
    this.deleteModal.show();
  }

  async addChapter(audiobookId: string) {
    this.addChapterModal.message = "Are you sure you want to add a new chapter for 1 point?";
    this.addChapterModal.confirmed.subscribe(async () => {
      const requestBody = new URLSearchParams();
        requestBody.append('audiobookId', audiobookId);

        const token = await this.auth.currentUser?.getIdToken();
        fetch(environment.API_URL_ADD_CHAPTER, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: requestBody.toString(),
        })
        .then(response => response.text())
        .then(async data => {
            if (data === 'Unauthorized') {
              this.alertService.error('Your session have expired!');
              await signOut(this.auth);
              this.router.navigate(['/']);
            } else if (data === 'Internal Server Error') {
              this.alertService.error('Adding chapter failed, please try again!');
            } else if (data === 'Insufficient points') {
              this.alertService.error('You do not have enough credit to add a new chapter.');
            }
        })
        .catch(error => {
            console.error(error);
            this.alertService.error('Adding chapter failed, please try again!');
        });
    });
    this.addChapterModal.show();
  }

  async buyPoints() {
    this.paymentInProgress = true;
    const success = await this.storeService.buyPoints();
    if (!success) {
      this.paymentInProgress = false;
    }
  }

  
  async subscribe() {
    this.subscriptionBenefitsModal.confirmed.subscribe(async () => {
      this.paymentInProgress = true;
      const success = await this.storeService.startSubscription();
      if (!success) {
        this.paymentInProgress = false;
      }
    });
    this.subscriptionBenefitsModal.show();
  }

  async subscriptionDetails() {
    this.paymentInProgress = true;
      const success = await this.storeService.cancelSubscription();
      if (!success) {
        this.paymentInProgress = false;
      }
  }

  async exportToITunes(audiobook: Audiobook) {
    console.log('export!');
    try {
      console.log('Exporting audiobook:', audiobook);
      const options: AudiobookExportOptions = {
        format: 'm4b',
        quality: 128, // 128kbps
        includeChapters: true,
        metadata: {
          artist: audiobook.starring,
          albumArtist: 'Novels AI', 
          genre: audiobook.genre,
          description: audiobook.plot,
          releaseDate: audiobook.createdDate // Already a Date object
        }
      };

      console.log('Calling audioService.exportToITunes...');
      const blob = await this.audioService.exportToITunes(audiobook, options);
      console.log('Received blob:', blob, 'Size:', blob?.size, 'Type:', blob?.type);
      
      if (!(blob instanceof Blob)) {
        console.error('Invalid blob received:', blob);
        throw new Error('Invalid audio blob received');
      }
      
      console.log('Creating download link...');
      const url = window.URL.createObjectURL(blob);
      console.log('Object URL created:', url);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${audiobook.title || 'audiobook'}.m4b`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      this.alertService.success('Audiobook exported successfully!');
    } catch (error: any) {
      console.error('Export failed:', error);
      this.alertService.error(`Export failed!`);
    }
  }
}
