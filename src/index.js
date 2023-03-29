import functions from '@google-cloud/functions-framework';
import { v4 } from 'uuid';
import Handlebars from 'handlebars';
import createChatResponse from './chat.js';
import generateSpeech from './speech.js';

functions.http('generate', async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  const requestId = v4();
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
    const completion = await createChatResponse(filledInStory);
    generateSpeech(completion.data.choices[0].message.content, `${requestId}/chapter-${chapter}`);
    filledInStory += `\n${completion.data.choices[0].message.content}\nContinue with Chapter ${chapter + 1}, only 2 paragraphs`;
  }

  res.send(requestId);
});
