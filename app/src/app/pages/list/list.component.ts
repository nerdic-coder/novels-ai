import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
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
import { environment } from '../../../environments/environment';
import { Audiobook, Chapter, narrationTypes, voices } from '../../models/audiobook';
import { StoreService } from '../../services/store.service';
import { AudioPlayerState, AudioService } from '../../services/audio.service';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  private auth = inject(Auth);
  private storiesShown = environment.STORIES_PER_PAGE;
  private audiobooksRef;
  firestore: Firestore = inject(Firestore);
  lastVisibleDocument: any = null;  // Track the last document in the previous query
  audiobooks: Audiobook[] = [];
  audiobooks$ = new BehaviorSubject<Audiobook[]>([]);
  canLoadMore = true;
  paymentInProgress = false;
  points = 0;
  playerState: AudioPlayerState | undefined;

  constructor(private storeService: StoreService, private router: Router, private audioService: AudioService) {
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

  ngOnInit() {
    this.audioService.state$.subscribe(state => {
      this.playerState = state;
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

  playChapter(novel: Audiobook, chapter: Chapter) {
    this.audioService.playChapter(novel, chapter);
  }

  onPlayPauseChapter(novel: Audiobook, chapter: Chapter) {
    if (this.isPlayingCurrentChapter(novel, chapter)) {
      // Toggle play/pause if it's the current chapter
      this.audioService.updatePlayingState(false);
    } else {
      // Play the new chapter
      this.audioService.playChapter(novel, chapter);
    }
  }

  isPlayingCurrentChapter(novel: Audiobook, chapter: Chapter): boolean {
    return this.audioService.isCurrentChapter(novel, chapter) && this.playerState!.isPlaying;
  }

  loadMoreNovels() {
    this.storiesShown += environment.STORIES_PER_PAGE;
    this.loadNovels();
  }

  getNarrationType(pov: string | undefined): string | undefined {
    return pov ? narrationTypes.get(pov) : undefined;
  }

  getVoice(voice: string | undefined): string | undefined {
    return voice ? voices.get(voice) : undefined;
  }
  
  async deleteAudiobook(audiobookId: string) {
    if (confirm("Are you sure you want to delete this book?")) {
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
              alert('Your session have expired!');
              await signOut(this.auth);
              this.router.navigate(['/']);
          } else if (data === 'Internal Server Error') {
              alert('Deleting Audiobook failed, please try again!');
          }
      })
      .catch(error => {
          console.error(error);
          alert('Deleting Audiobook failed, please try again!');
      });
    }
  }

  async addChapter(audiobookId: string) {
    if (confirm("Are you sure you want to add a new chapter for 1 point?")) {
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
                alert('Your session have expired!');
                await signOut(this.auth);
                this.router.navigate(['/']);
            } else if (data === 'Internal Server Error') {
                alert('Adding chapter failed, please try again!');
            } else if (data === 'Insufficient points') {
              alert('You do not have enough credit to add a new chapter.');
            }
        })
        .catch(error => {
            console.error(error);
            alert('Adding chapter failed, please try again!');
        });
    }
  }

  async buyPoints() {
    this.paymentInProgress = true;
    await this.storeService.buyPoints();
    this.paymentInProgress = false;
  }
}
