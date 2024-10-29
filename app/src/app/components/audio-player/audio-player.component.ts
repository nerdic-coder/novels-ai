import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Howl } from 'howler';
import { UpdateContentIfNotGeneratedByServerDirective } from '../../directives/update-content-if-not-generated-by-server.directive';
import { AudioPlayerState, AudioService } from '../../services/audio.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-audio-player',
  standalone: true,
  imports: [CommonModule, UpdateContentIfNotGeneratedByServerDirective],
  templateUrl: './audio-player.component.html',
  styleUrl: './audio-player.component.scss'
})
export class AudioPlayerComponent implements OnInit, OnDestroy {
  private player!: Howl;
  private animationFrameId: number | undefined;
  private stateSubscription: Subscription | undefined;
  
  playerState$ = this.audioService.state$;
  currentState: AudioPlayerState | null = null;
  
  progress: number = 0;
  currentTime: string = '0:00';
  duration: string = '0:00';
  isSeeking: boolean = false;
  isMuted = false;

  constructor(private audioService: AudioService) {
  }

  ngOnInit() {
    // Single subscription handling both state updates and chapter initialization
    this.stateSubscription = this.playerState$.subscribe(state => {
      // Only initialize player if chapter changes
      if (state.currentChapter?.chapterUrl !== this.currentState?.currentChapter?.chapterUrl) {
        this.initializePlayer(state.currentChapter?.chapterUrl);
      } else if (!state.isPlaying && this.player?.playing()) {
        this.player.pause();
      } else if (state.isPlaying && !this.player?.playing()) {
        this.player.play();
      }
      
      this.currentState = state;
    });
  }

  initializePlayer(src: string | undefined) {
    if (!src) return;

    if (this.player) {
      this.player.stop();
      this.player.unload();
    }

    this.player = new Howl({
      src: [src],
      html5: true,
      onload: () => {
        this.duration = this.formatTime(this.player.duration());
      },
      onplay: () => {
        this.audioService.updatePlayingState(true);
        this.startProgressUpdate();
      },
      onpause: () => {
        this.audioService.updatePlayingState(false);
        this.stopProgressUpdate();
      },
      onend: () => {
        this.audioService.updatePlayingState(false);
        this.stopProgressUpdate();
        this.playNextChapter();
      },
      onseek: () => {
        if (this.player?.playing()) {
          this.startProgressUpdate();
        }
      },
    });
    this.player.play();
  }

  playNextChapter() {
    this.audioService.playNextChapter();
  }

  startProgressUpdate() {
    const updateProgress = () => {
      if (this.player && !this.isSeeking) {
        const currentTime = this.player.seek() as number;
        this.progress = (currentTime / this.player.duration()) * 100;
        this.currentTime = this.formatTime(currentTime);
      }
      
      // Check the current state
      if (this.currentState?.isPlaying) {
        this.animationFrameId = requestAnimationFrame(updateProgress);
      }
    };
    
    updateProgress();
  }

  stopProgressUpdate() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  onProgressClick(event: MouseEvent): void {
    if (!this.player) return;

    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;
    
    // Ensure percentage is between 0 and 1
    const clampedPercentage = Math.max(0, Math.min(1, percentage));
    
    // Calculate the seek position in seconds
    const seekPosition = this.player.duration() * clampedPercentage;
    
    // Temporarily stop progress updates during seeking
    this.isSeeking = true;
    
    // Update the progress bar immediately for responsive UI
    this.progress = clampedPercentage * 100;
    this.currentTime = this.formatTime(seekPosition);
    
    // Seek to the new position
    this.player.seek(seekPosition);
    
    // Resume progress updates after a short delay
    setTimeout(() => {
      this.isSeeking = false;
    }, 100);
  }

  togglePlayPause() {
    if (!this.player || !this.currentState) return;
    
    const newPlayingState = !this.currentState.isPlaying;
    
    if (newPlayingState) {
      this.player.play();
    } else {
      this.player.pause();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.player.mute(this.isMuted);
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
  }

  ngOnDestroy(): void {
    this.stopProgressUpdate();
    if (this.player) {
      this.player.unload();
    }
    // Clean up subscription
    if (this.stateSubscription) {
      this.stateSubscription.unsubscribe();
    }
  }
}