import functions from '@google-cloud/functions-framework';
import { Storage } from '@google-cloud/storage';
import admin from './admin.js';
import ffmpeg from 'ffmpeg-static';
import { writeFileSync, unlinkSync, mkdtempSync, rmdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const storage = new Storage();
const bucketName = 'generated-books';

functions.http('exportAudiobook', async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, baggage, sentry-trace');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  try {
    // Verify authorization
    if (!req.get('Authorization') || !req.get('Authorization').startsWith('Bearer ')) {
      res.status(401).send('Unauthorized');
      return;
    }
    
    const idToken = req.get('Authorization').split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    const { audiobookId } = req.body;
    
    if (!audiobookId) {
      return res.status(400).send('Missing audiobookId');
    }

    // Check subscription status
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    if (!userDoc.exists || !userDoc.data().isSubscribed) {
      return res.status(403).send('Subscription required for exporting');
    }

    // Get audiobook data from Firestore
    const audiobookRef = admin.firestore().collection('users').doc(uid).collection('audiobooks').doc(audiobookId);
    const audiobookDoc = await audiobookRef.get();
    
    if (!audiobookDoc.exists) {
      return res.status(404).send('Audiobook not found');
    }
    
    const audiobookData = audiobookDoc.data();
    const { chapters, title } = audiobookData;
    
    if (!chapters?.length || !title) {
      return res.status(400).send('Invalid audiobook data');
    }

    // Create temp working directory
    const tempDir = mkdtempSync(join(tmpdir(), 'audiobook-export-'));
    const outputFile = join(tempDir, `${audiobookId}.m4b`);
    
    // Download audio files and create input list for ffmpeg
    const inputListPath = join(tempDir, 'input.txt');
    const inputList = [];
    
    for (const [index, chapter] of chapters.entries()) {
      const fileUrlParts = chapter.chapterUrl.split(`${bucketName}/`);
      const filePathInBucket = fileUrlParts[1];
      const originalExtension = filePathInBucket.split('.').pop();
      const tempFilePath = join(tempDir, `chapter-${index}.${originalExtension}`);
      
      // Download original file
      await storage.bucket(bucketName).file(filePathInBucket).download({ destination: tempFilePath });
      
      // Convert to MP3 if it's WAV
      let finalFilePath = tempFilePath;
      if (originalExtension.toLowerCase() === 'wav') {
        finalFilePath = join(tempDir, `chapter-${index}.mp3`);
        const { exec } = await import('child_process');
        await new Promise((resolve, reject) => {
          exec(`${ffmpeg} -i "${tempFilePath}" -codec:a libmp3lame -qscale:a 2 "${finalFilePath}"`, (error) => {
            if (error) reject(error);
            else resolve();
          });
        });
        unlinkSync(tempFilePath); // Remove original WAV after conversion
      }
      
      inputList.push(`file '${finalFilePath}'`);
    }
    
    writeFileSync(inputListPath, inputList.join('\n'));

    // Generate chapters metadata
    // Calculate chapter durations using ffprobe
    const durations = [];
    for (const file of inputList) {
      const { exec } = await import('child_process');
      const duration = await new Promise((resolve) => {
        exec(`ffprobe -i ${file.replace("file '", "").replace("'", "")} -show_entries format=duration -v quiet -of csv="p=0"`, 
          (error, stdout) => resolve(parseFloat(stdout)));
      });
      durations.push(duration);
    }

    let chapterStart = 0;
    const chaptersMetadata = durations.map((duration, index) => {
      const start = chapterStart;
      chapterStart += duration;
      return `;FFMETADATA1
[CHAPTER]
TIMEBASE=1/1000
START=${Math.round(start * 1000)}
END=${Math.round(chapterStart * 1000)}
title="Chapter ${index + 1}"
`;
    }).join('\n');
    const chaptersMetadataPath = join(tempDir, 'chapters.ffmetadata');
    writeFileSync(chaptersMetadataPath, chaptersMetadata);

    // Build ffmpeg command
    const ffmpegArgs = [
      '-f', 'concat',
      '-safe', '0',
      '-i', inputListPath,
      '-i', chaptersMetadataPath,
      '-map_metadata', '1',
      '-c', 'copy',
      '-movflags', 'use_metadata_tags',
      '-metadata', `title="${title}"`,
      // '-metadata', `artist=${metadata.author}`,
      // '-metadata', `album=${metadata.title}`,
      '-f', 'mp4',
      outputFile
    ];

    // Execute ffmpeg
    const { exec } = await import('child_process');
    exec(`${ffmpeg} ${ffmpegArgs.join(' ')}`, async (error) => {
      if (error) {
        console.error('FFmpeg error:', error);
        return res.status(500).send('Audio processing failed');
      }

      // Upload generated file
      const destinationPath = `exports/${audiobookId}/${uuidv4()}.m4b`;
      await storage.bucket(bucketName).upload(outputFile, {
        destination: destinationPath,
        metadata: { contentType: 'audio/mp4' }
      });

      // Cleanup temp files
      chapters.forEach((_, index) => unlinkSync(join(tempDir, `chapter-${index}.mp3`)));
      unlinkSync(inputListPath);
      unlinkSync(chaptersMetadataPath);
      unlinkSync(outputFile);
      rmdirSync(tempDir);

      res.status(200).json({
        downloadUrl: `https://storage.googleapis.com/${bucketName}/${destinationPath}`
      });
    });
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).send('Audiobook export failed');
  }
});
