import { Storage } from '@google-cloud/storage';
import OpenAI from 'openai';

const openai = new OpenAI({
  organization: process.env.chatOrganization,
  apiKey: process.env.chatApiKey,
});
const storage = new Storage();
const bucket = storage.bucket('generated-books');

export default async function generateSpeechAI(input, filename, metadata, last, messages, voice) {
  const request = {
    model: 'tts-1',
    voice: voice || 'alloy',
    input,
    response_format: 'wav',
  };
  console.log('request', request);
  const mp3 = await openai.audio.speech.create(request);
  const buffer = Buffer.from(await mp3.arrayBuffer());

  const file = bucket.file(`${filename}.wav`);

  const stream = file.createWriteStream({
    metadata: {
      contentType: 'audio/mpeg',
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

  stream.end(buffer);
}
