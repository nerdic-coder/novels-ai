import { Component, EventEmitter, Output, ViewChild, ElementRef, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as bootstrap from 'bootstrap';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-chapter-directions-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div #modalElement class="modal fade" tabindex="-1" aria-labelledby="chapterDirectionsLabel" aria-hidden="true" data-bs-theme="dark">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="chapterDirectionsLabel">Add Chapter Directions</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Directions (optional):</label>
              <textarea 
                class="form-control" 
                rows="5"
                [(ngModel)]="directions"
                placeholder="Example: Introduce a new character, create a plot twist..."></textarea>
              <div class="form-text">Guide the AI's writing for this chapter</div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" (click)="confirm()">Add Chapter</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ChapterDirectionsModalComponent {
  @ViewChild('modalElement') modalElement!: ElementRef;
  private modalInstance: any;
  directions: string = '';
  private audiobookId: string = '';
  @Output() confirmed = new EventEmitter<{ audiobookId: string, directions: string }>();

  constructor(private modalService: ModalService) {}

  async ngAfterViewInit() {
    this.modalInstance = await this.modalService.createModal(this.modalElement);
  }

  show(audiobookId: string) {
    this.audiobookId = audiobookId;
    this.modalInstance?.show();
  }

  confirm() {
    if (this.directions.trim()) {
      this.confirmed.emit({
        audiobookId: this.audiobookId,
        directions: this.directions
      });
    } else {
      this.confirmed.emit({
        audiobookId: this.audiobookId,
        directions: ''
      });
    }
    this.modalInstance?.hide();
    this.directions = '';
  }
}
