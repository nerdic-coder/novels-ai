import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExternalLinkDirective } from '../../directives/external-link.directive';
import { Audiobook, Chapter } from '../../models/audiobook';
import { AudioService } from '../../services/audio.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, ExternalLinkDirective],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  host: {
    'class': 'content'
  }
})
export class HomeComponent {
  audiobooks: Audiobook[] = [
    {
      title: 'The Guy stalking the office workers',
      id:  '1',
      chapters: [
        {
          chapterId: 1,
          chapterUrl: 'https://storage.googleapis.com/generated-books/UFwCsoadL0bCjE3Hft7Ys4ja1Fp1/e69b08b1-802c-48e7-a915-85a47f5bd31e/chapter-1.wav',
        }
      ],
    },
    {
      title: 'Quantum Shadows',
      id:  '2',
      chapters: [
        {
          chapterId: 1,
          chapterUrl: 'https://storage.googleapis.com/generated-books/UFwCsoadL0bCjE3Hft7Ys4ja1Fp1/e088bb6f-702e-4f1b-a53c-7a6dc3073cd3/chapter-1.wav',
        },
        {
          chapterId: 2,
          chapterUrl: 'https://storage.googleapis.com/generated-books/UFwCsoadL0bCjE3Hft7Ys4ja1Fp1/e088bb6f-702e-4f1b-a53c-7a6dc3073cd3/chapter-2.wav',
        }
      ],
    },
    {
      title: 'The Bus That Can\'t Stop',
      id:  '3',
      chapters: [
        {
          chapterId: 1,
          chapterUrl: 'https://storage.googleapis.com/generated-books/UFwCsoadL0bCjE3Hft7Ys4ja1Fp1/f365519b-ccb4-49db-973b-ae32d747b988/chapter-1.wav',
        }
      ],
    }
  ];

  constructor(private audioService: AudioService) { }

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
}
