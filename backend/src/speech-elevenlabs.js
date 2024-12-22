import { ElevenLabsClient } from "elevenlabs";
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucket = storage.bucket('generated-books');

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

export default async function generateSpeechElevenLabs(
  text, filename, metadata, last, messages, voice) {
  try {
    // Generate speech using ElevenLabs
    const audioStream = await elevenlabs.generate({
      voice,
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    });

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    // Upload to Google Cloud Storage with mp3 extension
    const extension = 'mp3';
    const file = bucket.file(`${filename}.${extension}`);
    const stream = file.createWriteStream({
      metadata: {
        contentType: 'audio/mp3',
      },
    });

    return new Promise((resolve, reject) => {
      stream.on('error', (streamErr) => {
        console.error(streamErr);
        metadata.update({
          status: 'error',
          messages,
        });
        reject(streamErr);
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
        resolve(extension);
      });

      // Write the audio buffer to the stream
      stream.end(audioBuffer);
    });
  } catch (err) {
    console.error('Error:', err);
    metadata.update({
      status: 'error',
      messages,
    });
    throw err;
  }
}
