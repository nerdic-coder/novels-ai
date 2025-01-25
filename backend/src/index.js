import functions from '@google-cloud/functions-framework';
import { Storage } from '@google-cloud/storage';
import { v4 } from 'uuid';
import Handlebars from 'handlebars';
import admin from './admin.js';
import sanitizeHtml from 'sanitize-html';

import createChatResponse from './chat.js';
import generateSpeechElevenLabs from './speech-elevenlabs.js';
import generateSpeechOpenAI from './speech-openai.js';
import storeMetadata, { spendUserPoints } from './store.js';
import voices from './voices.js';
import fetch from 'node-fetch';

async function fetchAndSanitizeWikiContent(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    console.log(`Fetching wiki content from: ${url}`);
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return '';
    
    const html = await response.text();
    
    // First pass: keep only paragraph tags
    const cleanHtml = sanitizeHtml(html, {
      allowedTags: ['p'],
      allowedAttributes: {},
      textFilter: (text) => 
        text.replace(/\s+/g, ' ') // Collapse whitespace
    });

    // Second pass: remove all HTML tags
    const textContent = sanitizeHtml(cleanHtml, {
      allowedTags: [],
      allowedAttributes: {}
    }).trim();

    return textContent;
  } catch (error) {
    console.error('Error fetching wiki content:', error);
    return '';
  } finally {
    clearTimeout(timeout);
  }
}

functions.http('generate', async (req, res) => {
  let metadata;
  let errorAfterPointDeduction = false;
  let userPoints;
  let uid;
  let userRef;
  let chapters;
  try {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, baggage, sentry-trace');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (!req.get('Authorization') || !req.get('Authorization').startsWith('Bearer ')) {
      res.status(401).send('Unauthorized');
      return;
    }
    const requestId = v4();
    // Get the ID token from the Authorization header
    const idToken = req.get('Authorization').split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    uid = decodedToken.uid;
    const voice = req.query.voice || req.body.voice || 'onyx';
    chapters = parseInt(req.query.chapters, 10) || parseInt(req.body.chapters, 10) || 1;

    userRef = admin.firestore().collection('users').doc(uid);
    userPoints = await spendUserPoints(userRef, chapters);
    errorAfterPointDeduction = true;
    // Check if devMode is enabled
    if (!process.env.devMode) {
      // Check if user has enough points
      if (userPoints < chapters || userPoints <= 0) {
        // await userRef.update({ points: userPoints + chapters });
        res.status(400).send('Insufficient points');
        return;
      }
    }

    // Validate required title
    const title = req.query.title || req.body.title;
    if (!title?.trim()) {
      res.status(400).send('Title is required');
      return;
    }

    let starring = req.body.starring || [];
    // Handle legacy string format if needed
    if (typeof starring === 'string') {
      try {
        starring = JSON.parse(starring);
      } catch {
        starring = [];
      }
    }

    for (const character of starring) {
      console.log('Processing character:', character.name);
      const { name, description = '', link, image } = character;
      
      let wikiContent = '';
      if (link) {
        wikiContent = await fetchAndSanitizeWikiContent(link);
      }

      const characterPrompt = Handlebars.compile(
        `Analyze this character for story generation, only reply with a description no more than 80 words:
        Name: {{name}}
        Description: {{description}}`
      )({
        name: name.trim(),
        description: `${description} ${wikiContent}`.trim()
      });

      const characterMessages = [{
        role: 'user',
        content: characterPrompt
      }];

      if (image) {
        characterMessages.push({
          role: 'user',
          content: [
            { type: 'text', text: 'Character appearance reference:' },
            {
              type: 'image_url',
              image_url: {
                url: image,
              },
            },
          ],
        });
      }

      // Get character analysis from OpenAI
      const charCompletion = await createChatResponse(characterMessages, uid);
      
      // Add AI-generated profile to character object
      character.aiProfile = charCompletion.choices[0].message.content;
    }
    const genre = req.query.genre || req.body.genre || '';
    const style = req.query.style || req.body.style || '';
    const plot = req.query.plot || req.body.plot || '';
    const location = req.query.location || req.body.location || '';
    const pov = req.query.pov || req.body.pov || '';
    const image = req.body.image || '';

    let povDescription = '';

    let story = 'Write a story suitable as an audiobook. Start with Chapter 1. Use present tense. Keep in mind good character building and not rushing the main plot. Each chapter can be a maximum of 1250 characters. Don\'t write out "Chapter N"';
    if (title) {
      story += 'With the title "{{title}}". ';
    }

    if (genre) {
      story += 'The genre is "{{genre}}". ';
    }

    if (style) {
      story += 'Should have the same style as the author "{{style}}". ';
    }
    
    if (starring) {
      story += 'The story is starring "{{starring}}". ';
    }

    if (plot) {
      story += 'The main plotline of the story is "{{plot}}". ';
    }

    if (location) {
      story += 'The story takes place in/at "{{location}}". ';
    }

    if (pov) {
      // Mapping POV values to descriptions
      const povDescriptions = {
        first: 'In the first-person point of view, the story is narrated directly by one of the characters, often the protagonist, using pronouns like "I" and "me." This narrator recounts events and describes their thoughts, feelings, and perceptions from their personal perspective.',
        'third-limited': 'The third person limited point of view features a narrator who is outside of the story and relates the thoughts, feelings, and experiences of a single character.',
        'third-omni': 'In the third person omniscient point of view, the narrator knows all the thoughts, actions, and feelings of every character in the story.',
        'third-object': 'This point of view features a narrator who reports only what is seen and heard, without providing access to the thoughts or feelings of any character.',
        second: 'The second-person point of view addresses the reader directly using "you," making the reader feel as if they are the protagonist of the story.',
        multiple: 'Multiple points of view involve telling the story from the perspectives of different characters, switching between them at set intervals.',
        consciousness: 'The stream of consciousness point of view attempts to capture the continuous flow of a character’s thoughts, feelings, and impressions in a disorganized or free-flowing manner.',
        unreliable: 'An unreliable narrator tells the story in a way that may not be completely accurate or credible, often due to personal bias, mental instability, or limited knowledge.',
        plural: 'First-person plural narration uses the collective "we," representing a group of characters with a shared experience or perspective.',
        detached: 'A detached narrator describes events in a neutral or emotionally distant manner, often without subjective commentary or engagement.',
      };

      // Select the appropriate description based on the selected POV
      povDescription = povDescriptions[pov] || '';
      story += '{{povDescription}} ';
    }

    // Compile the template
    const template = Handlebars.compile(story);

    // Fill in the placeholders with values from req.query, req.body, and other variables
    const context = {
      genre,
      style,
      starring: starring.map(char => 
        `${char.name}${char.description ? ` - ${char.description}` : ''}${char.aiProfile ? ` [Profile: ${char.aiProfile}]` : ''}`
      ).join(', '),
      chapters,
      title,
      plot,
      location,
      povDescription,
    };

    const messages = [];


    // Add main story prompt
    messages.push({
      role: 'system',
      content: `You are a {{genre}} author. Your task is to
      write {{genre}} stories in a rich and intriguing language in a slow pace building the
      story. Consider splitting up long sentences with sentence breaking punctuation.
      {{#if style}}Style inspired by: {{style}}{{/if}}`,
    });
    messages.push({
      role: 'user',
      content: template(context),
    });

    metadata = await storeMetadata(
      uid,
      requestId,
      title,
      chapters,
      messages,
      context.starring,
      genre,
      style,
      plot,
      location,
      voice,
      pov,
    );

    const messagesWithoutImage = [...messages];
    if (image) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: 'Integrate the content of the image into the story' },
          {
            type: 'image_url',
            image_url: {
              url: image,
            },
          },
        ],
      });
    }

    const lastChapter = true;
    const completion = await createChatResponse(messages, uid);

    messagesWithoutImage.push({
      role: 'assistant',
      content: completion.choices[0].message.content,
    });
    const voiceInfo = voices.get(voice);
    if (voiceInfo.service === 'elevenlabs') {
      await generateSpeechElevenLabs(
        completion.choices[0].message.content,
        `${uid}/${requestId}/chapter-1`,
        metadata,
        lastChapter,
        messagesWithoutImage,
        voice,
      );
    } else {
      await generateSpeechOpenAI(
        completion.choices[0].message.content,
        `${uid}/${requestId}/chapter-1`,
        metadata,
        lastChapter,
        messagesWithoutImage,
        voice,
      );
    }

    res.send(requestId);
  } catch (error) {
    console.error('Generate Error:', {
      error: error.message,
      stack: error.stack,
      uid,
      chapters,
      metadata: metadata?.id,
      userPoints
    });
    
    if (metadata) {
      await metadata.update({
        status: 'error',
        error: error.message
      });
    }
    
    if (errorAfterPointDeduction && userRef) {
      console.log(`Restoring ${chapters} points to user ${uid}`);
      await userRef.update({ 
        points: admin.firestore.FieldValue.increment(chapters) 
      });
    }
    
    res.status(500).json({
      error: 'Generation failed',
      message: error.message,
      pointsRestored: errorAfterPointDeduction ? chapters : 0
    });
  }
});

functions.http('delete', async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, baggage, sentry-trace');
  res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (!req.get('Authorization') || !req.get('Authorization').startsWith('Bearer ')) {
    res.status(401).send('Unauthorized');
    return;
  }
  // Get the ID token from the Authorization header
  const idToken = req.get('Authorization').split('Bearer ')[1];
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const { uid } = decodedToken;

  const audiobookId = req.query.audiobookId || req.body.audiobookId;

  if (!audiobookId) {
    res.status(400).send('Missing audiobookId');
    return;
  }

  // Get reference to audiobook document
  const audiobookRef = admin.firestore().collection('users').doc(uid).collection('audiobooks')
    .doc(audiobookId);

  // Get audiobook data and verify it exists
  const audiobookData = (await audiobookRef.get()).data();
  if (!audiobookData) {
    res.status(404).send(`Audiobook ${audiobookId} not found`);
    return;
  }

  // Delete the chapter files from Cloud Storage
  const filesToDelete = [];
  audiobookData.chapters.forEach((chapter) => {
    filesToDelete.push(chapter.chapterUrl);
  });

  // Delete audiobook document
  await audiobookRef.delete();

  // Delete chapter files from Cloud Storage
  const storage = new Storage();
  const bucket = storage.bucket('generated-books');

  console.log('filesToDelete', filesToDelete);
  await Promise.all(filesToDelete.map((fileUrl) => {
    const parts = fileUrl.split('generated-books/');
    const filePath = parts[1];
    const file = bucket.file(filePath);
    return file.delete();
  }));

  res.send(audiobookId);
});

functions.http('add-chapter', async (req, res) => {
  console.log('called!', req.method);
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, baggage');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (!req.get('Authorization') || !req.get('Authorization').startsWith('Bearer ')) {
    res.status(401).send('Unauthorized');
    return;
  }
  // Get the ID token from the Authorization header
  const idToken = req.get('Authorization').split('Bearer ')[1];
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const { uid } = decodedToken;

  const audiobookId = req.query.audiobookId || req.body.audiobookId;

  if (!audiobookId) {
    res.status(400).send('Missing audiobookId');
    return;
  }

  let errorAfterPointDeduction = false;
  const userRef = admin.firestore().collection('users').doc(uid);
  const userPoints = await spendUserPoints(userRef, 1);
  errorAfterPointDeduction = true;
  // Check if user has enough points
  if (userPoints <= 0) {
    // await userRef.update({ points: userPoints + 1 });
    res.status(400).send('Insufficient points');
    return;
  }
  let audiobookRef;
  try {
    // Get reference to audiobook document
    audiobookRef = admin.firestore().collection('users').doc(uid).collection('audiobooks')
      .doc(audiobookId);

    // Get audiobook data and verify it exists
    const audiobookData = (await audiobookRef.get()).data();
    if (!audiobookData) {
      res.status(404).send(`Audiobook ${audiobookId} not found`);
      return;
    }
    audiobookRef.update({
      status: 'progress',
    });

    const chapter = audiobookData.chapters.length + 1;
    const { messages } = audiobookData;
    const { chapters } = audiobookData;
    const { voice } = audiobookData;

    messages.push({
      role: 'user',
      content: `Now write chapter ${chapter} of the story`,
    });

    const completion = await createChatResponse(messages, uid);
    messages.push({
      role: 'assistant',
      content: completion.choices[0].message.content,
    });
    const voiceInfo = voices.get(voice);
    let extension;
    if (voiceInfo.service === 'elevenlabs') {
      extension = await generateSpeechElevenLabs(
        completion.choices[0].message.content,
        `${uid}/${audiobookData.requestId}/chapter-${chapter}`,
        audiobookRef,
        true,
        messages,
        voice,
      );
    } else {
      extension = await generateSpeechOpenAI(
        completion.choices[0].message.content,
        `${uid}/${audiobookData.requestId}/chapter-${chapter}`,
        audiobookRef,
        true,
        messages,
        voice,
      );
    }

    const audioBucketUrl = `https://storage.googleapis.com/generated-books/${uid}/${audiobookData.requestId}/`;
    chapters.push({
      chapterId: chapter,
      chapterUrl: `${audioBucketUrl}chapter-${chapter}.${extension}`,
    });

    audiobookRef.update({
      chapters,
    });

    res.send(audiobookId);
  } catch (error) {
    console.error('Error:', error);
    if (audiobookRef) {
      audiobookRef.update({
        status: 'error',
      });
    }
    if (errorAfterPointDeduction) {
      await userRef.update({ points: userPoints + 1 });
    }
    res.status(401).send('Unauthorized');
  }
});
