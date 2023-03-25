import textToSpeech from '@google-cloud/text-to-speech';
import fs from 'fs';

const client = new textToSpeech.TextToSpeechClient();

export default function generateSpeech(text, filename) {
  const request = {
    input: {
      text,
    },
    voice: {
      languageCode: 'en-US',
      name: 'en-US-Studio-M',
    },
    audioConfig: {
      audioEncoding: 'LINEAR16',
      effectsProfileId: [
        'headphone-class-device',
      ],
      pitch: -20,
      speakingRate: 0.65,
    },
  };

  client.synthesizeSpeech(request, (err, response) => {
    if (err) {
      console.error('Error:', err);
      return;
    }

    fs.writeFile(`${filename}.wav`, response.audioContent, 'binary', (fsErr) => {
      if (fsErr) {
        console.error('Error:', fsErr);
        return;
      }

      console.log(`Audio content written to file: ${filename}.wav`);
    });
  });
}
