import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Chapter, Audiobook, iTunesMetadata } from '../models/audiobook';
import { environment } from '../../environments/environment';
import { 
  Auth,
} from '@angular/fire/auth';

export interface AudioPlayerState {
  currentNovel: Audiobook | null;
  currentChapter: Chapter | null;
  queue: Chapter[];
  isPlaying: boolean;
}

export interface AudiobookExportOptions {
  format: 'm4b';
  quality?: number; // 64kbps, 128kbps, etc
  metadata?: iTunesMetadata;
  includeChapters: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private auth = inject(Auth);
  
  private state = new BehaviorSubject<AudioPlayerState>({
    currentNovel: null,
    currentChapter: null,
    queue: [],
    isPlaying: false
  });

  private lastChapterUpdate = 0;
  private readonly DEBOUNCE_TIME = 500; // 500ms

  state$ = this.state.asObservable();

  playChapter(novel: Audiobook, chapter: Chapter) {
    // Debounce check
    const now = Date.now();
    if (now - this.lastChapterUpdate < this.DEBOUNCE_TIME) {
      return;
    }
    this.lastChapterUpdate = now;

    const sortedChapters = novel.chapters;
    
    if (sortedChapters) {
      const currentIndex = sortedChapters.findIndex(c => c.chapterId === chapter.chapterId);
      const queue = sortedChapters.slice(currentIndex + 1);

      this.state.next({
        currentNovel: novel,
        currentChapter: chapter,
        queue,
        isPlaying: true
      });
    }
  }

  playNextChapter() {
    const currentState = this.state.value;
    
    if (currentState.queue.length > 0) {
      const nextChapter = currentState.queue[0];
      const newQueue = currentState.queue.slice(1);
      
      this.state.next({
        ...currentState,
        currentChapter: nextChapter,
        queue: newQueue,
        isPlaying: true
      });
    } else {
      // No more chapters in queue
      this.state.next({
        ...currentState,
        isPlaying: false
      });
    }
  }

  updatePlayingState(isPlaying: boolean) {
    const currentState = this.state.value;
    this.state.next({
      ...currentState,
      isPlaying
    });
  }

  isCurrentChapter(novel: Audiobook, chapter: Chapter): boolean {
    const state = this.state.value;
    return (
      state.currentNovel?.id === novel.id &&
      state.currentChapter?.chapterId === chapter.chapterId
    );
  }

  isPlaying(): boolean {
    const state = this.state.value;
    return (
      state.isPlaying
    );
  }

  async exportToITunes(audiobook: Audiobook, options: AudiobookExportOptions): Promise<Blob> {
    if (!audiobook.chapters || audiobook.chapters.length === 0) {
      throw new Error('Audiobook has no chapters to export');
    }

    // Call cloud function
    const result = await fetch(environment.API_URL_EXPORT_AUDIOBOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await this.auth.currentUser?.getIdToken()}`
      },
      body: JSON.stringify({ audiobookId: audiobook.id })
    });

    if (!result.ok) {
      const error = await result.json();
      throw new Error(error.message || 'Export failed');
    }

    const { downloadUrl, fileName } = await result.json();
    
    // Download generated file
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error('Failed to download exported file');
    
    return new Blob([await response.blob()], { type: 'audio/m4b' });
  }

}
