import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class VoiceService {
  constructor(private http: HttpClient) {}

  createVoice(voiceDescription: string, text: string) {
    return this.http.post('/createVoice', {
      voice_description: voiceDescription,
      text: text
    });
  }
}
