import { Component, ElementRef, inject, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { VoiceService } from '../../services/voice.service';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OffcanvasService } from '../../services/offcanvas.service';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { ChapterDirectionsModalComponent } from '../../components/chapter-directions-modal/chapter-directions-modal.component';
import { 
  Auth,
  signOut
} from '@angular/fire/auth';
import { Dropdown } from 'bootstrap';
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
  imports: [
    CommonModule,
    RouterModule,
    ChapterDirectionsModalComponent,
    ConfirmationModalComponent,
    SubscriptionBenefitsModalComponent,
    FormsModule
  ],
  templateUrl: './novels.component.html',
  styleUrl: './novels.component.scss'
})
export class NovelsComponent implements OnInit, AfterViewInit {
  private auth = inject(Auth);
  private storiesShown = environment.STORIES_PER_PAGE;
  private audiobooksRef;
  private offcanvasService = inject(OffcanvasService);
  private voiceService = inject(VoiceService);
  private offcanvasInstance: any = null;
  private voicesSubscription?: Subscription;
  customVoices: any[] = [];
  firestore: Firestore = inject(Firestore);
  lastVisibleDocument: any = null;  // Track the last document in the previous query
  audiobooks: Audiobook[] = [];
  audiobooks$ = new BehaviorSubject<Audiobook[]>([]);
  canLoadMore = true;
  paymentInProgress = false;
  points = 0;
  selectedAudiobook: Audiobook | null = null;
  @ViewChild('offcanvasElement') offcanvasElement!: ElementRef;
  @ViewChild('downloadDropdown') downloadDropdown!: ElementRef;
  @ViewChild('cancelSubscriptionModal') cancelSubscriptionModal!: ConfirmationModalComponent;
  @ViewChild('deleteModal') deleteModal!: ConfirmationModalComponent;
  @ViewChild('subscriptionBenefitsModal') subscriptionBenefitsModal!: SubscriptionBenefitsModalComponent;
  @ViewChild('addChapterModal') addChapterModal!: ChapterDirectionsModalComponent;
  isSubscribed = false;
  isExporting = false;
  newChapterDirections: string = '';

  constructor(
    private storeService: StoreService, 
    private router: Router, 
    private audioService: AudioService, 
    private alertService: AlertService,
    private route: ActivatedRoute,
    private domSanitizer: DomSanitizer,
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

        // Update selectedAudiobook if it's the changed one
        if (this.selectedAudiobook?.id === changedAudiobook.id) {
          this.selectedAudiobook = changedAudiobook;
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
    // Load custom voices
    this.voicesSubscription = this.voiceService.watchVoices().subscribe(voices => {
      this.customVoices = voices;
    });
    
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
    
    // Initialize dropdown after showing offcanvas
    if (this.downloadDropdown?.nativeElement) {
      new Dropdown(this.downloadDropdown.nativeElement);
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

  getVoice(voiceId: string | undefined): Voice | any {
    if (!voiceId) return undefined;
    
    // Check custom voices first
    const customVoice = this.customVoices.find(v => v.voiceId === voiceId);
    if (customVoice) {
      return {
        id: customVoice.voiceId,
        name: customVoice.voiceName,
        custom: true
      };
    }
    
    // Fall back to default voices
    return voices.get(voiceId);
  }

  ngOnDestroy() {
    if (this.voicesSubscription) {
      this.voicesSubscription.unsubscribe();
    }
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
          // Close the offcanvas if it's open
          if (this.offcanvasInstance) {
            this.offcanvasInstance.hide();
          }
      })
      .catch(error => {
          console.error(error);
          this.alertService.error('Deleting Audiobook failed, please try again!');
          // Close the offcanvas if it's open
          if (this.offcanvasInstance) {
            this.offcanvasInstance.hide();
          }
      });
    });
    this.deleteModal.show();
  }

  isAddingChapter = false;

  onChapterDirectionsConfirmed(event: { audiobookId: string, directions: string }) {
    this.addChapter(event.audiobookId, event.directions);
  }

  async addChapter(audiobookId: string, directions: string = '') {
    if (!audiobookId || this.isAddingChapter) return;
    this.isAddingChapter = true;
    
    try {
      const requestBody = new URLSearchParams();
      requestBody.append('audiobookId', audiobookId);
      
      if (directions) {
        requestBody.append('directions', directions);
      }

      const token = await this.auth.currentUser?.getIdToken();
      const response = await fetch(environment.API_URL_ADD_CHAPTER, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: requestBody.toString(),
      });

      const data = await response.text();
      if (data === 'Unauthorized') {
        this.alertService.error('Your session has expired!');
        await signOut(this.auth);
        this.router.navigate(['/']);
      } 
      else if (data === 'Insufficient points') {
        this.alertService.error('You do not have enough credit to add a new chapter.');
      }
      else if (!response.ok) {
        throw new Error('Failed to add chapter');
      }
      
      // Update local state for immediate UI feedback
      const updatedAudiobook = this.audiobooks.find(a => a.id === audiobookId);
      if (updatedAudiobook) {
        const newChapterNumber = (updatedAudiobook.chapters?.length || 0) + 1;
        const newChapter = {
          chapterId: newChapterNumber,
          chapterUrl: '',
          title: `Chapter ${newChapterNumber}`
        };
        updatedAudiobook.chapters = [
          ...(updatedAudiobook.chapters || []),
          newChapter
        ];
        // Update both the audiobooks list and selectedAudiobook if it's the same book
        this.audiobooks$.next([...this.audiobooks]);
        if (this.selectedAudiobook?.id === audiobookId) {
          this.selectedAudiobook = {...updatedAudiobook};
        }
      }

    } catch (error) {
      console.error(error);
      this.alertService.error('Adding chapter failed. Please try again.');
    } finally {
      this.isAddingChapter = false;
    }
  }

  
  async subscriptionDetails() {
    this.paymentInProgress = true;
      const success = await this.storeService.cancelSubscription();
      if (!success) {
        this.paymentInProgress = false;
      }
  }

  async exportToITunes(audiobook: Audiobook) {
    this.isExporting = true;
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
    } finally {
      this.isExporting = false;
    }
  }

  async exportAudiobookVideo(audiobook: Audiobook, chapterIndex: number) {
    this.isExporting = true;
    this.alertService.show({ type: 'info', message: '', timeout: 0 });
    this.alertService.show({ type: 'info', message: `Generating video. This might take a few minutes...`, timeout: 10000 });
    try {
      const token = await this.auth.currentUser?.getIdToken();
      const response = await fetch(environment.API_URL_EXPORT_AUDIOBOOK_VIDEO, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          audiobookId: audiobook.id,
          chapterIndex
        })
      });
  
      if (!response.ok) {
        throw new Error('Export video failed');
      }
  
      const data = await response.json();
  
      // Create a hidden <a> element with target="_blank"
      const downloadLink = document.createElement('a');
      downloadLink.href = data.downloadUrl;
      downloadLink.target = '_blank'; // Open in a new window/tab
      downloadLink.style.display = 'none'; // Hide the link
      document.body.appendChild(downloadLink);
  
      // Programmatically click the link
      downloadLink.click();
  
      // Clean up the link element
      document.body.removeChild(downloadLink);
  
      this.alertService.success(
        this.domSanitizer.bypassSecurityTrustHtml(
          `Video exported successfully! <a href="${data.downloadUrl}" 
           class="alert-link" 
           download="chapter-video.mp4"
           target="_blank"
           style="cursor: pointer; text-decoration: underline;">
           Click here if download didn't start</a>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
          `
        ),
        30000
      );
    } catch (err: any) {
      console.error(err);
      this.alertService.error('Export video failed!');
    } finally {
      this.isExporting = false;
    }
  }
  

  downloadChapterAudio(audiobook: Audiobook, chapterIndex: number) {
    const chapter = audiobook.chapters?.[chapterIndex];
    if (chapter && chapter.chapterUrl) {
      window.open(chapter.chapterUrl, '_blank');
    } else {
      this.alertService.error("Chapter audio not available");
    }
  }
}
