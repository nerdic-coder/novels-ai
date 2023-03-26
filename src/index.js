import functions from '@google-cloud/functions-framework';
import { v4 } from 'uuid';
import createChatResponse from './chat.js';
import generateSpeech from './speech.js';

functions.http('generate', async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  const requestId = v4();
  const chapters = req.query.chapters || req.body.chapters || 3;
  const starring = req.body.starring ? `Starring ${req.body.starring}.` : '';

  let story = `Write an audiobook, a ${req.query.genre || req.body.genre || 'book'} 
    in the style of ${req.query.style || req.body.style || 'book'}.
    ${starring}
    Start with Chapter 1, only 2 paragraphs (a total of ${chapters} chapters), don't write out "Chapter N"`;

  for (let chapter = 1; chapter <= chapters; chapter += 1) {
    if (chapter === chapters) {
      story += ', the ending';
    }
    // eslint-disable-next-line no-await-in-loop
    const completion = await createChatResponse(story);
    generateSpeech(completion.data.choices[0].message.content, `${requestId}/chapter-${chapter}`);
    story += `\n${completion.data.choices[0].message.content}\nContinue with Chapter ${chapter + 1}, only 2 paragraphs`;
  }

  res.send(requestId);
});
