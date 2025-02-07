import functions from '@google-cloud/functions-framework';
import { Storage } from '@google-cloud/storage';
import admin from './admin.js';
import { exec } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
const ffmpeg = ffmpegPath;
import { writeFileSync, unlinkSync, mkdtempSync, rmdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import path from 'path';

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

    // Check subscription status - same logic as store.service.ts
    const subscriptionsRef = admin.firestore().collection('users').doc(uid).collection('subscriptions');
    const q = subscriptionsRef.where('status', 'in', ['trialing', 'active']);
    const snapshot = await q.get();
    if (snapshot.empty) {
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

functions.http('exportAudiobookVideo', async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, baggage, sentry-trace');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  try {
    if (!req.get('Authorization') || !req.get('Authorization').startsWith('Bearer ')) {
      res.status(401).send('Unauthorized');
      return;
    }
    const idToken = req.get('Authorization').split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const { audiobookId, chapterIndex } = req.body;
    if (!audiobookId || chapterIndex === undefined) {
      return res.status(400).send('Missing audiobookId or chapterIndex');
    }

    const subscriptionsRef = admin.firestore().collection('users').doc(uid).collection('subscriptions');
    const q = subscriptionsRef.where('status', 'in', ['trialing', 'active']);
    const snapshot = await q.get();
    let isMonthly = true;
    if (snapshot.empty) {
      isMonthly = false;
    }

    const audiobookRef = admin.firestore().collection('users').doc(uid).collection('audiobooks').doc(audiobookId);
    const audiobookDoc = await audiobookRef.get();
    if (!audiobookDoc.exists) {
      return res.status(404).send('Audiobook not found');
    }
    const audiobookData = audiobookDoc.data();
    const { chapters, messages, title } = audiobookData;
    if (!chapters || !Array.isArray(chapters)) {
      return res.status(400).send('No chapters available');
    }
    if (chapterIndex < 0 || chapterIndex >= chapters.length) {
      return res.status(400).send('Invalid chapter index');
    }
    const chapter = chapters[chapterIndex];
    if (chapter.chapterVideoUrl) {
      return res.status(200).json({ downloadUrl: chapter.chapterVideoUrl });
    }
    if (!chapter.chapterUrl) {
      return res.status(400).send('Chapter audio file not available');
    }
    const tempDir = mkdtempSync(join(tmpdir(), 'audiobook-video-export-'));
    const localAudioPath = join(tempDir, `chapter-audio.mp3`);
    const fileUrlParts = chapter.chapterUrl.split(`${bucketName}/`);
    const filePathInBucket = fileUrlParts[1];
    await storage.bucket(bucketName).file(filePathInBucket).download({ destination: localAudioPath });

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).send('No messages available for subtitles');
    }
    const assistantMessages = messages.filter(msg => msg.role === 'assistant');
    if (chapterIndex < 0 || chapterIndex >= assistantMessages.length) {
      return res.status(400).send('Invalid chapter index for subtitles');
    }
    const chapterFullText = assistantMessages[chapterIndex].content;

    async function createSrt(audioPath) {
      const { createReadStream } = await import('fs');
      const openai = new OpenAI();
      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(audioPath),
        model: "whisper-1",
        response_format: "srt"
      });
      return transcription;
    }
    const srtContent = await createSrt(localAudioPath);

    const srtPath = join(tempDir, 'subtitle.srt');
    writeFileSync(srtPath, srtContent);
  
    // Download random background video from videobackgrounds bucket
    const [bgFiles] = await storage.bucket('videobackgrounds').getFiles();
    const bgMp4Files = bgFiles.filter(file => file.name.endsWith('.mp4'));
    if (bgMp4Files.length === 0) {
      throw new Error("No background videos available");
    }
    const randomBgFile = bgMp4Files[Math.floor(Math.random() * bgMp4Files.length)];
    const backgroundVideoPath = join(tempDir, 'background.mp4');
    await storage.bucket('videobackgrounds').file(randomBgFile.name).download({ destination: backgroundVideoPath });
    const videoPath = join(tempDir, 'video.mp4');
    const fontPath = path.join(process.cwd(), 'fonts', 'KOMIKAX.ttf');
    const fontDir = path.dirname(fontPath);
    const audioDuration = (() => {
      let lastEnd = 0;
      const regex = /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/g;
      let match;
      while ((match = regex.exec(srtContent)) !== null) {
        const hours = parseInt(match[5], 10);
        const minutes = parseInt(match[6], 10);
        const seconds = parseInt(match[7], 10);
        const milliseconds = parseInt(match[8], 10);
        const endTime = hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
        if (endTime > lastEnd) {
          lastEnd = endTime;
        }
      }
      return lastEnd + 1;
    })();

    let ffmpegCommand = "";
    if (!isMonthly) {
      const watermarkPath = path.join(process.cwd(), 'watermark.png');
      ffmpegCommand = `${ffmpeg} -stream_loop -1 -i "${backgroundVideoPath}" -i "${localAudioPath}" -i "${watermarkPath}" -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,subtitles='${srtPath}':fontsdir='${fontDir}':force_style='FontName=Louis George Cafe,Bold=1,FontSize=14,Alignment=10,MarginH=280,MarginV=160'[sub]; [sub][2:v] overlay=main_w-overlay_w-10:main_h-overlay_h-10[out]" -map "[out]" -map 1:a -c:v libx264 -c:a aac -t ${audioDuration} "${videoPath}"`;
    } else {
      ffmpegCommand = `${ffmpeg} -stream_loop -1 -i "${backgroundVideoPath}" -i "${localAudioPath}" -filter_complex "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,subtitles='${srtPath}':fontsdir='${fontDir}':force_style='FontName=Louis George Cafe,Bold=1,FontSize=14,Alignment=10,MarginH=280,MarginV=160'[v]" -map "[v]" -map 1:a -c:v libx264 -c:a aac -t ${audioDuration} "${videoPath}"`;
    }
    await new Promise((resolve, reject) => {
      exec(ffmpegCommand, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
    const destinationPath = `exports/${audiobookId}/video-${chapterIndex}-${uuidv4()}.mp4`;
    await storage.bucket(bucketName).upload(videoPath, {
      destination: destinationPath,
      metadata: { contentType: 'video/mp4' }
    });
    const chapterVideoUrl = `https://storage.googleapis.com/${bucketName}/${destinationPath}`;
    let updatedChapters = chapters.slice();
    updatedChapters[chapterIndex] = { ...updatedChapters[chapterIndex], chapterVideoUrl };
    await audiobookRef.update({ chapters: updatedChapters });
    unlinkSync(localAudioPath);
    unlinkSync(srtPath);
    unlinkSync(videoPath);
    rmdirSync(tempDir, { recursive: true });
    res.status(200).json({ downloadUrl: chapterVideoUrl });
  } catch (error) {
    console.error('Export video error:', error);
    res.status(500).send('Audiobook video export failed');
  }
});

