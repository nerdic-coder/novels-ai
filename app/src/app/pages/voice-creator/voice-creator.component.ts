import { Component, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AlertService } from '../../services/alert.service';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment.loader';

@Component({
  selector: 'app-voice-creator',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterModule, HttpClientModule],
  template: `
    <div class="container mt-4">
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div class="card bg-dark text-white">
            <div class="card-header">
              <h4 class="mb-0">Custom Voice Creator</h4>
            </div>
            <div class="card-body">
              <form (ngSubmit)="onSubmit()" #voiceForm="ngForm">
                <div class="mb-3">
                  <label for="voiceDescription" class="form-label">Voice Description</label>
                  <textarea
                    id="voiceDescription"
                    name="voiceDescription"
                    [(ngModel)]="voiceDescription"
                    class="form-control bg-secondary text-white"
                    rows="3"
                    required
                    placeholder="Example: 'A deep, resonant voice with a British accent'"
                  ></textarea>
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
                    placeholder="Enter text to generate voice preview (max 500 characters)"
                  ></textarea>
                </div>

                <button 
                  type="submit" 
                  class="btn btn-primary"
                  [disabled]="isGenerating"
                >
                  {{ isGenerating ? 'Generating...' : 'Create Voice Preview' }}
                </button>
              </form>

              <div *ngIf="previews.length > 0" class="mt-4">
                <h5>Generated Previews:</h5>
                <div *ngFor="let preview of previews" class="mb-3">
                  <audio controls class="w-100">
                    <source [src]="getAudioSrc(preview.audio_base_64)" [type]="preview.media_type">
                    Your browser does not support the audio element.
                  </audio>
                  <div class="mt-2 text-muted">
                    Duration: {{ preview.duration_secs }} seconds
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
  private http = inject(HttpClient);
  private alertService = inject(AlertService);

  voiceDescription = '';
  sampleText = '';
  isGenerating = false;
  previews: any[] = [];

  getAudioSrc(base64Data: string): string {
    return `data:audio/mpeg;base64,${base64Data}`;
  }

  async onSubmit() {
    if (!this.voiceDescription || !this.sampleText) return;

    this.isGenerating = true;
    try {
      const response = await this.http.post(environment.API_URL_CREATE_VOICE, {
        voice_description: this.voiceDescription,
        text: this.sampleText
      }).toPromise();

      this.previews = (response as any).previews;
      this.alertService.success('Voice preview generated successfully!');
    } catch (error) {
      console.error('Voice creation failed:', error);
      this.alertService.error('Failed to generate voice preview. Please try again.');
    } finally {
      this.isGenerating = false;
    }
  }
}
