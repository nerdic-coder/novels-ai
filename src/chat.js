import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  organization: 'org-N7umWbUcyaPqa8C12MSH4Na5',
  apiKey: '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',
});

const openai = new OpenAIApi(configuration);

export default async function createChatResponse(content) {
  return openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    user: 'johan',
    messages: [{
      name: 'johan',
      role: 'user',
      content,
    }],
  });
}
