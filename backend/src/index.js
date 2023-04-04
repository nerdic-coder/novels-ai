import functions from '@google-cloud/functions-framework';
import { v4 } from 'uuid';
import Handlebars from 'handlebars';
import admin from './admin.js';
import createChatResponse from './chat.js';
import generateSpeech from './speech.js';
import storeMetadata from './store.js';

functions.http('generate', async (req, res) => {
  let metadata;
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
    const voice = req.query.voice || req.body.voice || 'en-US-Neural2-J';
    const chapters = parseInt(req.query.chapters, 10) || parseInt(req.body.chapters, 10) || 1;
    const starring = req.query.starring || req.body.starring ? `Starring ${req.query.starring || req.body.starring}.` : '';
    const title = req.query.title || req.body.title || '';
    const genre = req.query.genre || req.body.genre || 'book';
    const style = req.query.style || req.body.style || 'general';

    const story = process.env.chatPrompt || `Write a short story with the title "{{title}}", the genre is "{{genre}}".
    in the style of "{{style}}".
    {{starring}}
    Start with Chapter 1, only 2 paragraphs (a total of {{chapters}} chapters), use present tense, don't write out "Chapter N", add some character dialogs.`;

    // Compile the template
    const template = Handlebars.compile(story);

    // Fill in the placeholders with values from req.query, req.body, and other variables
    const context = {
      genre,
      style,
      starring,
      chapters,
      title,
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
        content: completion.data.choices[0].message.content,
      });
      generateSpeech(
        completion.data.choices[0].message.content,
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
    res.status(401).send('Unauthorized');
  }
});
