const { env } = require("../config/env");
const { createResponse } = require("./openai");
const {
  buildChatInstructions,
  buildResearchInstructions,
  buildDocumentInstructions,
  buildComparisonInstructions,
  buildLibraryInstructions,
} = require("./prompts");
const { collectResponseSources } = require("../research/citations");
const { AppError } = require("../utils/errors");
const { appendSources } = require("../research/researchFormatter");
const { buildResearchPrompt, isResearchFollowUp, shouldUseWebSearch } = require("../research/researchAgent");
const { researchWithWeb } = require("../research/webResearch");

function buildHistoryText(history) {
  if (!Array.isArray(history) || !history.length) {
    return "";
  }

  return ["Conversation history:", ...history.map((turn) => `${turn.role === "assistant" ? "Assistant" : "User"}: ${turn.content}`)].join("\n");
}

function buildAttachmentText(attachments) {
  if (!Array.isArray(attachments) || !attachments.length) {
    return "";
  }

  return [
    "File context:",
    ...attachments.map((attachment) => [
      `Filename: ${attachment.filename}`,
      `Kind: ${attachment.kind}`,
      attachment.analysis ? `Analysis:\n${attachment.analysis}` : "",
      `Extracted text:\n${attachment.text}`,
    ].filter(Boolean).join("\n")),
  ].join("\n\n---\n\n");
}

async function runPrompt({ instructions, prompt, maxOutputTokens = 1800 }) {
  const response = await createResponse({
    instructions,
    input: prompt,
    max_output_tokens: maxOutputTokens,
  });

  const text = String(response.output_text || "").trim();

  if (!text) {
    throw new AppError("OpenAI returned an empty response.", "EMPTY_RESPONSE", 502);
  }

  const sources = collectResponseSources(response);

  return {
    text: appendSources(text, sources),
    sources,
    responseId: response.id,
  };
}

async function answerChat({ question, history = [], attachments = [], context = "" }) {
  const prompt = [
    context,
    buildHistoryText(history),
    buildAttachmentText(attachments),
    `User question:\n${question}`,
  ].filter(Boolean).join("\n\n");

  return runPrompt({
    instructions: buildChatInstructions(),
    prompt,
  });
}

async function answerResearch({ query, history = [], attachments = [], context = "", forceWebSearch = false }) {
  const prompt = buildResearchPrompt({
    query,
    historyText: buildHistoryText(history),
    attachmentText: buildAttachmentText(attachments),
    context,
  });

  if (forceWebSearch || shouldUseWebSearch(query)) {
    return researchWithWeb({
      instructions: buildResearchInstructions(),
      prompt,
    });
  }

  return runPrompt({
    instructions: buildResearchInstructions(),
    prompt,
    maxOutputTokens: 2400,
  });
}

async function answerDocument({ prompt, attachments = [], history = [], context = "" }) {
  const fileContext = buildAttachmentText(attachments);

  return runPrompt({
    instructions: buildDocumentInstructions(),
    prompt: [context, buildHistoryText(history), fileContext, `User request:\n${prompt}`].filter(Boolean).join("\n\n"),
    maxOutputTokens: 2200,
  });
}

async function answerComparison({ prompt, attachments = [], history = [], context = "" }) {
  const fileContext = buildAttachmentText(attachments);

  return runPrompt({
    instructions: buildComparisonInstructions(),
    prompt: [
      context,
      buildHistoryText(history),
      fileContext,
      [
        `Comparison request:\n${prompt}`,
        "Return a comparison table, similarities, differences, and research gaps.",
        "Never mix facts between documents.",
      ].join("\n"),
    ].filter(Boolean).join("\n\n"),
    maxOutputTokens: 2400,
  });
}

async function answerLibraryQuestion({ prompt, libraryContext = "", history = [] }) {
  return runPrompt({
    instructions: buildLibraryInstructions(),
    prompt: [libraryContext, buildHistoryText(history), `User question:\n${prompt}`].filter(Boolean).join("\n\n"),
    maxOutputTokens: 2000,
  });
}

module.exports = {
  answerChat,
  answerResearch,
  answerDocument,
  answerComparison,
  answerLibraryQuestion,
  shouldUseWebSearch,
  isResearchFollowUp,
  buildHistoryText,
  buildAttachmentText,
};