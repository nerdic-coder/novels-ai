import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  organization: process.env.chatOrganization,
  apiKey: process.env.chatApiKey,
});

const openai = new OpenAIApi(configuration);

export default async function createChatResponse(messages, user) {
  return openai.createChatCompletion({
    model: process.env.chatModel || 'gpt-3.5-turbo',
    user,
    messages,
  });
}
