const { createResponse } = require("../ai/openai");
const { AppError } = require("../utils/errors");
const { collectResponseSources, formatResponseTextWithCitations } = require("./citations");
const { appendSources } = require("./researchFormatter");

async function researchWithWeb({ instructions, prompt, maxOutputTokens = 3000, createResponseFn = createResponse }) {
  let response;

  try {
    response = await createResponseFn(
      {
        instructions,
        input: prompt,
        max_output_tokens: maxOutputTokens,
        tools: [{
          type: "web_search",
          external_web_access: true,
          search_context_size: "high",
        }],
        tool_choice: "auto",
        include: ["web_search_call.action.sources"],
      },
      { timeout: 180000 },
    );
  } catch (error) {
    throw new AppError("Sorry, I couldn't complete the web research right now. Please try again.", "WEB_RESEARCH_FAILED", error?.status || 502, {
      cause: error?.message,
    });
  }

  const searchCalls = (response?.output || []).filter((item) => item?.type === "web_search_call");
  const completedSearch = searchCalls.some((item) => item.status === "completed");
  const sources = collectResponseSources(response);
  const text = formatResponseTextWithCitations(response, sources).trim();

  if (!completedSearch || !text || !sources.length) {
    throw new AppError("Sorry, I couldn't complete the web research right now. Please try again.", "INCOMPLETE_WEB_RESEARCH", 502, {
      responseId: response?.id,
      searchStatuses: searchCalls.map((item) => item.status),
      sourceCount: sources.length,
      hasText: Boolean(text),
    });
  }

  return {
    text: appendSources(text, sources),
    sources,
    responseId: response.id,
    webSearchPerformed: true,
  };
}

module.exports = {
  researchWithWeb,
};