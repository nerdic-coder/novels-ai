import functions from '@google-cloud/functions-framework';
import { Storage } from '@google-cloud/storage';
import { v4 } from 'uuid';
import Handlebars from 'handlebars';
import admin from './admin.js';
import createChatResponse from './chat.js';
import generateSpeech from './speech2.js';
import storeMetadata, { updateUserPoints } from './store.js';

functions.http('generate', async (req, res) => {
  let metadata;
  let errorAfterPointDeduction = false;
  let userPoints;
  let uid;
  let userRef;
  let chapters;
  try {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }
    if (!req.get('Authorization')) {
      res.status(401).send('Unauthorized');
    }
    const requestId = v4();
    // Get the ID token from the Authorization header
    const idToken = req.get('Authorization').split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    uid = decodedToken.uid;
    const voice = req.query.voice || req.body.voice || 'onyx';
    chapters = parseInt(req.query.chapters, 10) || parseInt(req.body.chapters, 10) || 1;

    userRef = admin.firestore().collection('users').doc(uid);
    userPoints = updateUserPoints(userRef, chapters);
    errorAfterPointDeduction = true;
    // Check if user has enough points
    if (userPoints < chapters) {
      await userRef.update({ points: userPoints + chapters });
      res.status(400).send('Insufficient points');
      return;
    }

    const starring = req.query.starring || req.body.starring ? `${req.query.starring || req.body.starring}` : '';
    const title = req.query.title || req.body.title || '';
    const genre = req.query.genre || req.body.genre || '';
    const style = req.query.style || req.body.style || '';
    const plot = req.query.plot || req.body.plot || '';

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

    // Compile the template
    const template = Handlebars.compile(story);

    // Fill in the placeholders with values from req.query, req.body, and other variables
    const context = {
      genre,
      style,
      starring,
      chapters,
      title,
      plot,
    };

    const messages = [];
    messages.push({
      role: 'system',
      content: `: You are a ${genre} author. Your task is to
      write ${genre} stories in a rich and intriguing language in a very slow pace building the
      story.`,
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
      starring,
      genre,
      style,
      plot,
      voice,
    );

    let lastChapter = false;
    for (let chapter = 1; chapter <= chapters; chapter += 1) {
      if (chapter !== 1) {
        messages.push({
          role: 'user',
          content: `Now write chapter ${chapter} of the story`,
        });
      }
      if (chapter === chapters) {
        lastChapter = true;
      }
      // eslint-disable-next-line no-await-in-loop
      const completion = await createChatResponse(messages, uid);
      messages.push({
        role: 'assistant',
        content: completion.choices[0].message.content,
      });
      generateSpeech(
        completion.choices[0].message.content,
        `${uid}/${requestId}/chapter-${chapter}`,
        metadata,
        lastChapter,
        messages,
        voice,
      );
    }

    res.send(requestId);
  } catch (error) {
    console.error('Error:', error);
    if (metadata) {
      metadata.update({
        status: 'error',
      });
    }
    if (errorAfterPointDeduction) {
      await userRef.update({ points: userPoints + chapters });
    }
    res.status(401).send('Unauthorized');
  }
});

functions.http('delete', async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (!req.get('Authorization')) {
    res.status(401).send('Unauthorized');
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
  res.set('Access-Control-Allow-Headers', 'Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }
  if (!req.get('Authorization')) {
    res.status(401).send('Unauthorized');
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
  const userPoints = updateUserPoints(userRef, 1);
  errorAfterPointDeduction = true;
  // Check if user has enough points
  if (userPoints < 1) {
    await userRef.update({ points: userPoints + 1 });
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
    generateSpeech(
      completion.choices[0].message.content,
      `${uid}/${audiobookData.requestId}/chapter-${chapter}`,
      audiobookRef,
      true,
      messages,
      voice || 'onyx',
    );

    const audioBucketUrl = `https://storage.googleapis.com/generated-books/${uid}/${audiobookData.requestId}/`;
    chapters.push({
      chapterId: chapter,
      chapterUrl: `${audioBucketUrl}chapter-${chapter}.mp3`,
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
