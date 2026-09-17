const { answerChat, answerResearch, answerDocument, answerComparison, isResearchFollowUp, shouldUseWebSearch } = require("../ai/assistant");
const { processAttachments } = require("../files/fileHandler");
const { appendConversationTurn, getConversation } = require("../memory/conversationMemory");
const { buildSessionContext, addSessionResult } = require("../memory/researchMemory");
const { isBotMentioned, stripBotMention, splitDiscordMessage } = require("../utils/discord");
const { takeCooldown } = require("../utils/rateLimit");
const { toUserMessage } = require("../utils/errors");
const { error } = require("../utils/logger");

function getScope(message) {
  return {
    guildId: message.guildId,
    channelId: message.channelId,
    userId: message.author.id,
  };
}

function shouldCompare(prompt, attachments) {
  if (attachments.length < 2) {
    return false;
  }

  return /\b(compare|comparison|versus|vs\.?|difference|differences|contrast)\b/i.test(prompt);
}

function shouldUseDocumentMode(prompt, attachments) {
  if (!attachments.length) {
    return false;
  }

  if (!prompt.trim()) {
    return true;
  }

  return /\b(summarize|summarise|review|analyze|analyse|explain|read|paper|document|pdf|file|study|article|code|dataset|csv|spreadsheet|excel)\b/i.test(prompt);
}

async function sendChunkedMessage(message, text) {
  const chunks = splitDiscordMessage(text);

  if (!chunks.length) {
    await message.reply("No response was generated.");
    return;
  }

  await message.reply(chunks.shift());

  for (const chunk of chunks) {
    await message.channel.send(chunk);
  }
}

async function handleMentionMessage(client, message) {
  if (!message.content || message.author.bot || !client.user || !isBotMentioned(message.content, client.user.id)) {
    return;
  }

  const prompt = stripBotMention(message.content, client.user.id);
  const scope = getScope(message);

  if (!prompt.trim() && message.attachments.size === 0) {
    await message.reply("Yes, I am here. What would you like to research?");
    return;
  }

  const cooldown = takeCooldown(message.author.id);

  if (!cooldown.allowed) {
    await message.reply(`Please wait ${Math.ceil(cooldown.retryAfterMs / 1000)} seconds before sending another AI request.`);
    return;
  }

  try {
    await message.channel.sendTyping();

    const attachments = message.attachments.size ? await processAttachments([...message.attachments.values()]) : [];
    const sessionContext = buildSessionContext(scope);
    const requestText = prompt.trim() || "[attachment upload]";
    const conversation = getConversation(scope);

    appendConversationTurn(scope, "user", requestText);

    let result;

    if (shouldCompare(prompt, attachments)) {
      result = await answerComparison({
        prompt,
        attachments,
        history: conversation,
        context: sessionContext,
      });
    } else if (shouldUseWebSearch(prompt) || isResearchFollowUp(prompt, conversation)) {
      result = await answerResearch({
        query: prompt,
        history: conversation,
        attachments,
        context: sessionContext,
        forceWebSearch: true,
      });
    } else if (shouldUseDocumentMode(prompt, attachments)) {
      result = await answerDocument({
        prompt,
        attachments,
        history: conversation,
        context: sessionContext,
      });
    } else {
      result = await answerChat({
        question: prompt,
        history: conversation,
        attachments,
        context: sessionContext,
      });
    }

    appendConversationTurn(scope, "assistant", result.text);

    if (result.sources?.length) {
      addSessionResult(scope, {
        query: prompt,
        answer: result.text,
        sources: result.sources,
      });
    }

    await sendChunkedMessage(message, result.text);
  } catch (messageError) {
    error("Message handling failed", messageError.message);
    await message.reply(toUserMessage(messageError, "I could not process that request."));
  }
}

module.exports = {
  handleMentionMessage,
};