import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, doc } from '@angular/fire/firestore';
import { Auth } from '@angular/fire/auth';
import { authState } from '@angular/fire/auth';
import { environment } from '../../environments/environment.loader';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
// AI
@Injectable({
  providedIn: 'root'
})
export class VoiceService {
  constructor(
    private readonly firestore: Firestore,
    private readonly auth: Auth
  ) {}

  private customVoicesCache: any[] | null = null;

  async createVoice(voiceDescription: string, text: string) {
    const idToken = await this.auth.currentUser?.getIdToken();
    const response = await fetch(environment.API_URL_CREATE_VOICE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({
        voice_description: voiceDescription,
        text: text
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Voice creation failed');
    }
    return data;
  }

  async saveCustomVoice(
    voiceId: string,
    voiceName: string,
    voiceDescription: string,
    previewSound: string
  ) {
    const idToken = await this.auth.currentUser?.getIdToken();
    const response = await fetch(`${environment.API_URL_SAVE_VOICE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      },
      body: JSON.stringify({
        voiceId,
        voiceName,
        voiceDescription,
        previewSound
      })
    });
    this.customVoicesCache = null;
    return await response.json();
  }

  async listVoices() {
    if (this.customVoicesCache) {
      return this.customVoicesCache;
    }
    const idToken = await this.auth.currentUser?.getIdToken();
    const response = await fetch(environment.API_URL_LIST_VOICES, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`
      }
    });
    const voices = await response.json();
    this.customVoicesCache = voices;
    return voices;
  }

  watchVoices(): Observable<any[]> {
    return authState(this.auth).pipe(
      switchMap(user => {
        if (!user) return [];
        const customVoicesCollection = collection(
          this.firestore,
          'users',
          user.uid,
          'customVoices'
        );
        return collectionData(customVoicesCollection, { idField: 'id' });
      })
    );
  }

  clearVoicesCache(): void {
    this.customVoicesCache = null;
  }
}
