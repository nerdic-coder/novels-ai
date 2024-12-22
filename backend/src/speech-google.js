import textToSpeech from '@google-cloud/text-to-speech';
import { Storage } from '@google-cloud/storage';

const client = new textToSpeech.TextToSpeechClient();
const storage = new Storage();
const bucket = storage.bucket('generated-books');

export default function generateSpeechGoogle(text, filename, metadata, last, messages, voice) {
  const request = {
    input: {
      text,
    },
    voice: {
      languageCode: 'en-US',
      name: voice,
    },
    audioConfig: {
      audioEncoding: 'LINEAR16',
      effectsProfileId: [
        'headphone-class-device',
      ],
      pitch: -4,
      speakingRate: 0.8,
    },
  };

  client.synthesizeSpeech(request, (err, response) => {
    if (err) {
      console.error('Error:', err);
      metadata.update({
        status: 'error',
        messages,
      });
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
      metadata.update({
        status: 'error',
        messages,
      });
    });

    stream.on('finish', () => {
      console.log('File uploaded successfully.');
      if (last) {
        console.log('Last file uploaded successfully.');
        metadata.update({
          status: 'completed',
          messages,
        });
      }
    });

    stream.end(response.audioContent);
  });
}
