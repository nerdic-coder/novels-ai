import createChatResponse from './chat.js';
import generateSpeech from './speech.js';

const chapters = 3;

let story = `Write an audiobook, a drama show in the style of Kurt Sutter,
starring a teacher named Magnus, who is the lead singer in a pop band on his free time.
Start with Chapter 1, only 2 paragraphs (a total of ${chapters} chapters), don't write out "Chapter N"`;

for (let chapter = 1; chapter <= chapters; chapter += 1) {
  if (chapter === chapters) {
    story += ', the ending';
  }
  // eslint-disable-next-line no-await-in-loop
  const completion = await createChatResponse(story);
  generateSpeech(completion.data.choices[0].message.content, `chapter-${chapter}`);
  story += `\n${completion.data.choices[0].message.content}\nContinue with Chapter ${chapter + 1}, only 2 paragraphs`;
}
