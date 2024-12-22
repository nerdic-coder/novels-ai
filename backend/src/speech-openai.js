import { Storage } from '@google-cloud/storage';
import OpenAI from 'openai';

const openai = new OpenAI({
  organization: process.env.chatOrganization,
  apiKey: process.env.chatApiKey,
});
const storage = new Storage();
const bucket = storage.bucket('generated-books');

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default async function generateSpeechOpenAI(
  input, filename, metadata, last, messages, voice) {
  let attempts = 0;
  let lastError;

  while (attempts < MAX_RETRIES) {
    try {
      const request = {
        model: 'tts-1',
        voice: voice || 'alloy',
        input,
        response_format: 'wav',
      };

      const mp3 = await openai.audio.speech.create(request);

      // Ensure we have a valid response before proceeding
      if (!mp3) {
        throw new Error('Empty response from OpenAI API');
      }

      const arrayBuffer = await mp3.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Empty array buffer received');
      }

      const buffer = Buffer.from(arrayBuffer);
      if (buffer.length === 0) {
        throw new Error('Empty buffer after conversion');
      }

      return await uploadToStorage(buffer, filename, metadata, last, messages);
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempts + 1} failed:`, error);

      if (attempts < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY * Math.pow(2, attempts)); // Exponential backoff
        attempts++;
      } else {
        console.error('All retry attempts failed');
        metadata.update({
          status: 'error',
          errorMessage: `Speech generation failed after ${MAX_RETRIES} attempts: ${error.message}`,
          messages,
        });
        throw error;
      }
    }
  }

  throw lastError;
}

async function uploadToStorage(buffer, filename, metadata, last, messages) {

  return new Promise((resolve, reject) => {
    const file = bucket.file(`${filename}.wav`);

    const stream = file.createWriteStream({
      metadata: {
        contentType: 'audio/mpeg',
      },
      resumable: false, // Disable resumable uploads for smaller files
    });

    stream.on('error', (streamErr) => {
      console.error('Stream error:', streamErr);
      metadata.update({
        status: 'error',
        errorMessage: `Upload failed: ${streamErr.message}`,
        messages,
      });
      reject(streamErr);
    });

    stream.on('finish', () => {
      console.log('File uploaded successfully.');
      if (last) {
        console.log('Last file uploaded successfully.');
        try {
          metadata.update({
            status: 'completed',
            messages,
          });
        } catch (err) {
          console.error('Metadata update error:', err);
          metadata.update({
            status: 'error',
            errorMessage: `Metadata update failed: ${err.message}`,
          });
          reject(err);
          return;
        }
      }
      resolve('wav');
    });

    stream.end(buffer);
  });
}
