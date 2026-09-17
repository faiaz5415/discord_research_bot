const OpenAI = require("openai");
const { env } = require("../config/env");

let openaiClient;

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });
  }

  return openaiClient;
}

async function createResponse(params, options = {}) {
  return getOpenAIClient().responses.create(
    {
      model: env.OPENAI_MODEL,
      ...params,
    },
    {
      timeout: 60000,
      ...options,
    },
  );
}

module.exports = {
  getOpenAIClient,
  createResponse,
};