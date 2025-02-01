import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AlertService } from '../../services/alert.service';
import { Auth } from '@angular/fire/auth';
import { environment } from '../../../environments/environment.loader';

@Component({
  selector: 'app-voice-creator',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="container mt-4">
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div class="card bg-dark text-white">
            <div class="card-header">
              <h4 class="mb-0">Custom Voice Creator</h4>
            </div>
            <div class="card-body">
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
                    <div class="card bg-secondary text-white">
                      <div class="card-body">
                        <audio controls class="w-100">
                          <source [src]="getAudioSrc(preview.audio_base_64)" 
                                  [type]="preview.media_type">
                          Your browser does not support the audio element.
                        </audio>
                        <div class="mt-2">
                          <small class="text-muted">
                            Duration: {{ preview.duration_secs | number:'1.1-1' }} seconds<br>
                            Voice ID: {{ preview.generated_voice_id }}
                          </small>
                        </div>
                      </div>
                    </div>
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
export class VoiceCreatorComponent {
  private auth = inject(Auth);
  private alertService = inject(AlertService);

  voiceDescription = '';
  sampleText = '';
  isGenerating = false;
  previews: any[] = [];
  showForm = true;

  getAudioSrc(base64Data: string): string {
    return `data:audio/mpeg;base64,${base64Data}`;
  }

  resetForm() {
    this.showForm = true;
    this.voiceDescription = '';
    this.sampleText = '';
    this.previews = [];
  }

  async onSubmit() {
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
      const idToken = await this.auth.currentUser?.getIdToken();
      
      const response = await fetch(environment.API_URL_CREATE_VOICE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          voice_description: desc,
          text: text
        })
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        const errorToThrow = new Error(errorResponse.message);
        // Attach additional error details
        (errorToThrow as any).details = errorResponse.detail;
        throw errorToThrow;
      }

      this.previews = (await response.json()).previews;
      this.showForm = false; // Hide form on success
      this.alertService.success('Voice preview generated successfully!');
    } catch (error: any) {
      console.error('Voice creation failed:', error);
      let message = error.message;
      
      // If we have a detailed error from backend response
      if (error.details) {
        message = error.details.message || message;
      }
      
      this.alertService.error(message);
    } finally {
      this.isGenerating = false;
    }
  }
}
