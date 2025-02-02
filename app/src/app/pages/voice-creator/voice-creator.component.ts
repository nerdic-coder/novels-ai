import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AlertService } from '../../services/alert.service';
import { StoreService } from '../../services/store.service';
import { VoiceService } from '../../services/voice.service';
import { Firestore, collection, doc, onSnapshot } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
// AI

@Component({
  selector: 'app-voice-creator',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterModule, CommonModule],
  template: `
    <div class="container mt-4">
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div class="card bg-dark text-white">
            <div class="card-header">
              <h4 class="mb-0">Custom Voice Creator</h4>
            </div>
            <div class="card-body">
              <div class="mb-3 alert alert-info">
                Creating a voice preview costs <strong>1 credit</strong>.
                You have {{points}} credits remaining.
              </div>
              <!-- Form - Only show when no previews -->
              <div *ngIf="isSubscribed; else notSubscribed">
                <!-- Form - Only show when no previews -->
                <form *ngIf="showForm" (ngSubmit)="onSubmit()" #voiceForm="ngForm">
                  <div class="mb-3">
                    <label for="voiceDescription" class="form-label">Voice Description</label>
                    <textarea
                      id="voiceDescription"
                      name="voiceDescription"
                      [(ngModel)]="voiceDescription"
                      class="form-control bg-secondary text-white"
                      rows="3"
                      required
                      minlength="20"
                      maxlength="1000"
                      placeholder="Example: 'A deep, resonant voice with a British accent (20-1000 characters required)'"
                    ></textarea>
                    <div class="form-text text-end">
                      {{ voiceDescription.length }}/1000 characters
                    </div>
                    @if (voiceDescription.length < 20 && voiceDescription.length > 0) {
                      <div class="text-danger mt-1">
                        Description must be at least 20 characters
                      </div>
                    }
                  </div>

                  <div class="mb-3">
                    <label for="sampleText" class="form-label">Sample Text</label>
                    <textarea
                      id="sampleText"
                      name="sampleText"
                      [(ngModel)]="sampleText"
                      class="form-control bg-secondary text-white"
                      rows="5"
                      required
                      minlength="100"
                      maxlength="1000"
                      placeholder="Enter text to generate voice preview (100-1000 characters required)"
                    ></textarea>
                    <div class="form-text text-end">
                      {{ sampleText.length }}/1000 characters
                    </div>
                    @if (sampleText.length < 100 && sampleText.length > 0) {
                      <div class="text-danger mt-1">
                        Sample text must be at least 100 characters
                      </div>
                    }
                  </div>

                  <button 
                    type="submit" 
                    class="btn btn-primary"
                    [disabled]="isGenerating"
                  >
                    {{ isGenerating ? 'Generating...' : 'Create Voice Preview' }}
                  </button>
                </form>
              </div>
              <ng-template #notSubscribed>
                <div class="alert alert-warning">
                  You must be a monthly subscriber to create new voice previews or save custom voices.
                </div>
              </ng-template>

              <!-- Preview Section - Show after successful generation -->
              <div *ngIf="previews.length > 0">
                <div class="d-flex justify-content-between align-items-center mb-4">
                  <h5>Generated Voice Previews</h5>
                  <button class="btn btn-sm btn-outline-secondary" 
                          (click)="resetForm()">
                    Create New Voice
                  </button>
                </div>
                
                <div class="preview-list">
                  <div *ngFor="let preview of previews" class="preview-item mb-4">
                    <div class="card border-light bg-dark text-white">
                      <div class="card-body">
                        <div class="mb-3">
                          <label class="form-label">Voice Name</label>
                          <input
                            type="text"
                            class="form-control"
                            [(ngModel)]="preview.voiceName"
                            placeholder="My Custom Voice"
                            required
                            minlength="3"
                            maxlength="50"
                          >
                          <div class="form-text text-end">
                            {{ preview.voiceName?.length || 0 }}/50 characters
                          </div>
                        </div>
                        <audio controls class="w-100">
                          <source [src]="getAudioSrc(preview.audio_base_64)" 
                                  [type]="preview.media_type">
                          Your browser does not support the audio element.
                        </audio>
                        <div class="mt-2">
                          <small class="text-muted">
                            Duration: {{ preview.duration_secs | number:'1.1-1' }} seconds<br>
                          </small>
                        </div>
                        <button 
                          class="btn btn-success mt-2" 
                          (click)="saveVoice(preview)"
                          [disabled]="!preview.voiceName || preview.voiceName.length < 3"
                        >Save Voice</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div *ngIf="savedVoices.length > 0" class="mt-4">
                <h5>Saved Voices</h5>
                <div *ngFor="let voice of savedVoices" class="card border-light bg-dark text-white mb-2">
                  <div class="card-body">
                    <p>
                      <strong>Name:</strong> {{ voice.voiceName }}<br>
                      <strong>Description:</strong> {{ voice.voiceDescription }}
                    </p>
                    <audio controls class="w-100">
                      <source [src]="getAudioSrc(voice.previewSound)" type="audio/mpeg">
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  // styleUrl: './voice-creator.component.scss'
})
export class VoiceCreatorComponent implements OnInit, OnDestroy {
  private firestore = inject(Firestore);
  private auth = inject(Auth);
  private unsubscribeVoiceListener?: () => void;

  constructor(
    private alertService: AlertService,
    private storeService: StoreService,
    private voiceService: VoiceService
  ) {}

  voiceDescription = '';
  sampleText = '';
  isGenerating = false;
  previews: any[] = [];
  showForm = true;
  savedVoices: any[] = [];
  points = 0;
  isSubscribed = false;

  async ngOnInit(): Promise<void> {
    // Add subscription status check (using your storeService)
    this.isSubscribed = await this.storeService.isSubscribed();

    const user = this.auth.currentUser;
    if (!user) return;

    const customVoicesRef = collection(
      this.firestore,
      'users',
      user.uid,
      'customVoices'
    );

    // Subscribe to points updates
    const userDoc = doc(this.firestore, 'users', user.uid);
    onSnapshot(userDoc, (doc: any) => {
      if (doc.exists()) {
        const data = doc.data();
        this.points = data?.points ?? 0;
      }
    });

    this.unsubscribeVoiceListener = onSnapshot(customVoicesRef, 
      (snapshot) => {
        this.savedVoices = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('Updated voices:', this.savedVoices);
      },
      (error) => {
        console.error('Error listening to voices:', error);
        this.alertService.error('Failed to load saved voices');
      }
    );
  }

  ngOnDestroy(): void {
    if (this.unsubscribeVoiceListener) {
      this.unsubscribeVoiceListener();
    }
  }

  async loadSavedVoices(): Promise<void> {
    try {
      this.savedVoices = await this.voiceService.listVoices();
    } catch (error: any) {
      console.error('Failed to load saved voices', error);
      this.alertService.error('Failed to fetch saved voices');
    }
  }

  getAudioSrc(base64Data: string): string {
    return `data:audio/mpeg;base64,${base64Data}`;
  }

  resetForm() {
    this.showForm = true;
    this.voiceDescription = '';
    this.sampleText = '';
    this.previews = [];
  }

  async saveVoice(preview: any) {
    if (!this.isSubscribed) {
      this.alertService.error('Only monthly subscribers can save custom voices.');
      return;
    }
    if (!preview.voiceName?.trim()) {
      this.alertService.error('Please enter a voice name');
      return;
    }

    try {
      await this.voiceService.saveCustomVoice(
        preview.generated_voice_id,
        preview.voiceName.trim(),
        this.voiceDescription,
        preview.audio_base_64
      );
      this.alertService.success('Voice saved successfully!');
    } catch (err: any) {
      this.alertService.error('Failed to save voice: ' + err.message);
    }
  }

  async onSubmit() {
    if (!this.isSubscribed) {
      this.alertService.error('Only monthly subscribers can create new voice previews.');
      return;
    }
    const desc = this.voiceDescription.trim();
    const text = this.sampleText.trim();

    // Client-side validation
    if (!desc || !text) {
      this.alertService.error('Both fields are required');
      return;
    }

    if (desc.length < 20 || desc.length > 1000) {
      this.alertService.error('Voice description must be between 20 and 1000 characters');
      return;
    }

    if (text.length < 100 || text.length > 1000) {
      this.alertService.error('Sample text must be between 100 and 1000 characters');
      return;
    }

    this.isGenerating = true;
    try {
      const result = await this.voiceService.createVoice(desc, text);
      this.previews = (result as any).previews;
      this.showForm = false; // Hide form on success
      this.alertService.success('Voice preview generated successfully!');
    } catch (error: any) {
      console.error('Voice creation failed:', error);
      let message = error.message;

      if (error.details) {
        message = error.details.message || message;
      }

      this.alertService.error(message);
    } finally {
      this.isGenerating = false;
    }
  }
}
