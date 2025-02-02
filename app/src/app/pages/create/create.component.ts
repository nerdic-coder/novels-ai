import { Component, inject } from '@angular/core';
import { AudiobookRequest, narrationTypes, Voice, voices } from '../../models/audiobook';
import { PromptTemplate } from '../../models/template';
declare var bootstrap: any;
import { 
  Auth,
  signOut
} from '@angular/fire/auth';
import { 
  Firestore, 
  collection, 
  doc,
  onSnapshot,
} from '@angular/fire/firestore';
import { environment } from '../../../environments/environment.loader';
import { StoreService } from '../../services/store.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../../services/alert.service';
import { VoiceService } from '../../services/voice.service';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss'
})
export class CreateComponent {
  private auth = inject(Auth);
  firestore: Firestore = inject(Firestore);
  alertService = inject(AlertService);
  points = 0;
  paymentInProgress = false;
  creationInProgress = false;
  baseVoices: [string, any][] = [];
  customVoices: [string, any][] = [];

  voicesArray: [string, Voice][] = [];
  narrationTypesArray  = Array.from(narrationTypes.entries());

  title: string = '';
  genre: string = '';
  style: string = '';
  plot: string = '';
  location: string = '';
  pov: string = '';
  selectedVoice = 'onyx'; // Default selected value, change this based on your logic
  characters: Array<{name: string; description: string; link?: string; image?: string}> = [{name: '', description: ''}];

  onCharacterImageSelected(event: Event, index: number) {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        this.characters[index].image = reader.result as string;
      };
    }
  }
  imageInput: any;
  templates: PromptTemplate[] = [];
  selectedTemplateId: string | null = null;
  newTemplateName: string = '';

  async ngOnInit() {
    await this.loadTemplates();
    await this.loadCustomVoices();
  }

  async loadCustomVoices() {
    try {
      const custom = await this.voiceService.listVoices();
      this.customVoices = custom.map((v: { voiceId: any; voiceName: string; }) => [v.voiceId, { name: `${v.voiceName}`, subscriberOnly: false }]);
      this.voicesArray = [...this.baseVoices, ...this.customVoices];
    } catch (error) {
      console.error("Error loading custom voices:", error);
    }
  }

  constructor(public storeService: StoreService, private router: Router, private voiceService: VoiceService) {
    // Subscribe to subscription status
    this.storeService.subscriptionStatus$.subscribe(isSubscribed => {
      // Set base voices
      this.baseVoices = Array.from(voices.entries());
      this.voicesArray = [...this.baseVoices, ...this.customVoices];
      
      // If selected voice is subscriber-only and user is not subscribed, switch to default
      if (this.selectedVoice) {
        const selectedVoiceData = voices.get(this.selectedVoice);
        if (selectedVoiceData?.subscriberOnly && !isSubscribed) {
          this.selectedVoice = 'onyx'; // Default to non-subscriber voice
        }
      }
    });

    const usersCollection = collection(this.firestore, 'users');
    const currentUserDoc = doc(usersCollection, this.auth.currentUser?.uid);
    // Subscribe to real-time updates on the user's document
    onSnapshot(currentUserDoc, (doc: any) => {
      if (doc.exists) {
        let points = doc.data()?.points ?? 0;
        if (points === undefined) {
            points = 2;
        }
        this.points = points;
      }
    }, (error) => {
      console.error(`Error getting user document: ${error}`);
    });
  }

  addCharacter() {
    this.characters.push({name: '', description: ''});
  }

  removeCharacter(index: number) {
    this.characters.splice(index, 1);
  }

  async buyPoints() {
    this.paymentInProgress = true;
    const success = await this.storeService.buyPoints();
    if (!success) {
      this.paymentInProgress = false;
    }
  }

  // Helper function to handle the POST request
  async postData(token: string | undefined, formData: any) {
    // POST request
    const response = await fetch(environment.API_URL_GENERATE_NEW_NOVEL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });
    
    const data = await response.text();

    // Re-enable the submit button
    this.creationInProgress = false;

    if (data === 'Unauthorized') {
      this.alertService.error('Your session has expired!');
      await signOut(this.auth);
      this.router.navigate(['/']);
    } else {
      this.router.navigate(['/novels']);
    }
  }

  onFileSelected(event: Event) {
    const fileInput = event.target as HTMLInputElement;

    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const reader = new FileReader();

      reader.readAsDataURL(file); // Read the file as a base64 encoded string
      
      reader.onload = async () => {
        this.imageInput = reader.result as string; // Ensure reader.result is a string
      };
    }
  }

  async generateAudiobook() {
    if (!this.title?.trim()) {
      this.alertService.error('Title is required');
      return;
    }

    // Disable submit button
    this.creationInProgress = true;
    
    try {
      const token = await this.auth.currentUser?.getIdToken();
    
      // Gather form data
      const formData: AudiobookRequest = {
        voice: this.selectedVoice,
        pov: this.pov,
        genre: this.genre,
        title: this.title,
        style: this.style,
        plot: this.plot,
        location: this.location,
        starring: this.characters.filter(char => char.name.trim() || char.description.trim()),
        image: this.imageInput ? this.imageInput : null
      };
    
      await this.postData(token, formData);
    
    } catch (error) {
      console.error(error);
      this.alertService.error('Creating novel failed, please try again!');
    
      // Re-enable the submit button
      this.creationInProgress = false;
    }
  }

  async loadTemplates() {
    const token = await this.auth.currentUser?.getIdToken();
    const response = await fetch(environment.API_URL_GET_TEMPLATES, {
      headers: { Authorization: `Bearer ${token}` }
    });
    this.templates = await response.json();
  }

  loadingTemplate = false;

  async loadTemplate() {
    if (!this.selectedTemplateId) return;
    
    this.loadingTemplate = true;
    try {
      const token = await this.auth.currentUser?.getIdToken();
      const response = await fetch(`${environment.API_URL_TEMPLATES}${this.selectedTemplateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load template: ${response.statusText}`);
      }
      
      const template = await response.json();
      
      // Reset form before loading new values
      this.characters = [{name: '', description: ''}];
      
      // Assign template values
      this.title = template.title || '';
      this.genre = template.genre || '';
      this.style = template.style || '';
      this.plot = template.plot || '';
      this.location = template.location || '';
      this.pov = template.pov || '';
      this.selectedVoice = template.selectedVoice || 'onyx';
      this.characters = template.characters?.length 
        ? template.characters 
        : [{name: '', description: ''}];
    } catch (error) {
      console.error('Error loading template:', error);
      this.alertService.error('Failed to load template. Please try again.');
      this.selectedTemplateId = null;
    } finally {
      this.loadingTemplate = false;
    }
  }

  openSaveTemplateModal() {
    this.newTemplateName = '';
    
    // Prefill name if updating existing template
    if (this.selectedTemplateId) {
      const selectedTemplate = this.templates.find(t => t.id === this.selectedTemplateId);
      if (selectedTemplate) {
        this.newTemplateName = selectedTemplate.name;
      }
    }

    const modal = new bootstrap.Modal(document.getElementById('templateNameModal'));
    modal.show();
  }

  async saveTemplate() {
    const templateData = {
      name: this.newTemplateName,
      title: this.title,
      genre: this.genre,
      style: this.style,
      plot: this.plot,
      location: this.location,
      pov: this.pov,
      selectedVoice: this.selectedVoice,
      characters: this.characters
    };

    const token = await this.auth.currentUser?.getIdToken();
    const url = this.selectedTemplateId 
      ? `${environment.API_URL_TEMPLATES}${this.selectedTemplateId}`
      : environment.API_URL_TEMPLATES;

    await fetch(url, {
      method: this.selectedTemplateId ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(templateData)
    });

    await this.loadTemplates();
    const modal = bootstrap.Modal.getInstance(document.getElementById('templateNameModal'));
    modal.hide();
  }

  async deleteTemplate() {
    if (!this.selectedTemplateId) return;

    const confirm = window.confirm('Delete this template permanently?');
    if (!confirm) return;

    const token = await this.auth.currentUser?.getIdToken();
    await fetch(`${environment.API_URL_TEMPLATES}${this.selectedTemplateId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    await this.loadTemplates();
    this.selectedTemplateId = null;
  }

  clearForm() {
    const confirmClear = window.confirm('Are you sure you want to clear all form fields?');
    if (!confirmClear) return;

    // Reset all form fields
    this.title = '';
    this.genre = '';
    this.style = '';
    this.plot = '';
    this.location = '';
    this.pov = '';
    this.selectedVoice = 'onyx';
    this.characters = [{name: '', description: ''}];
    this.imageInput = null;
    this.selectedTemplateId = null;
    
    this.alertService.success('Form cleared successfully');
  }
}
