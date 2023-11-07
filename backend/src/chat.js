import OpenAI from 'openai';

const openai = new OpenAI({
  organization: process.env.chatOrganization,
  apiKey: process.env.chatApiKey,
});

export default async function createChatResponse(messages, user) {
  return openai.chat.completions.create({
    model: process.env.chatModel || 'gpt-4',
    user,
    messages,
  });
}
