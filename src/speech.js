import textToSpeech from '@google-cloud/text-to-speech';
import { Storage } from '@google-cloud/storage';

const client = new textToSpeech.TextToSpeechClient();
const storage = new Storage();
const bucket = storage.bucket('generated-books');

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

    const file = bucket.file(`${filename}.wav`);
    const stream = file.createWriteStream({
      metadata: {
        contentType: 'audio/wav',
      },
    });

    stream.on('error', (streamErr) => {
      console.error(streamErr);
    });

    stream.on('finish', () => {
      console.log('File uploaded successfully.');
    });

    stream.end(response.audioContent);
  });
}
