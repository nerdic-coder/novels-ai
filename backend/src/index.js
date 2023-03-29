import functions from '@google-cloud/functions-framework';
import { v4 } from 'uuid';
import Handlebars from 'handlebars';
import admin from 'firebase-admin';
import createChatResponse from './chat.js';
import generateSpeech from './speech.js';

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.ADMIN_SECRET)),
  databaseURL: 'https://ai-audiobook.firebaseio.com',
});

functions.http('generate', async (req, res) => {
  try {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Authorization');
    if (!req.get('Authorization')) {
      res.send('');
      return;
    }
    const requestId = v4();
    // Get the ID token from the Authorization header
    const idToken = req.get('Authorization').split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid } = decodedToken;
    const chapters = req.query.chapters || req.body.chapters || 3;
    const starring = req.query.starring || req.body.starring ? `Starring ${req.query.starring || req.body.starring}.` : '';

    const story = process.env.chatPrompt || `Write a short story with the title "{{title}}", the genre is "{{genre}}".
    in the style of "{{style}}".
    {{starring}}
    Start with Chapter 1, only 2 paragraphs (a total of {{chapters}} chapters), use present tense, don't write out "Chapter N", add some character dialogs.`;

    // Compile the template
    const template = Handlebars.compile(story);

    // Fill in the placeholders with values from req.query, req.body, and other variables
    const context = {
      genre: req.query.genre || req.body.genre || 'book',
      style: req.query.style || req.body.style || 'general',
      starring,
      chapters,
      title: req.query.title || req.body.title || '',
    };

    let filledInStory = template(context);

    for (let chapter = 1; chapter <= chapters; chapter += 1) {
      if (chapter === chapters) {
        filledInStory += ', the ending';
      }
      // eslint-disable-next-line no-await-in-loop
      const completion = await createChatResponse(filledInStory, uid);
      generateSpeech(completion.data.choices[0].message.content, `${uid}/${requestId}/chapter-${chapter}`);
      filledInStory += `\n${completion.data.choices[0].message.content}\nContinue with Chapter ${chapter + 1}, only 2 paragraphs`;
    }

    res.send(requestId);
  } catch (error) {
    console.error('Error:', error);
    res.status(401).send('Unauthorized');
  }
});
