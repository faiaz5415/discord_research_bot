const MENTION_LIMIT = 1900;

function buildMentionRegex(botId) {
  return new RegExp(`<@!?${botId}>`, "g");
}

function isBotMentioned(content, botId) {
  if (!content || !botId) {
    return false;
  }

  return buildMentionRegex(botId).test(content);
}

function stripBotMention(content, botId) {
  if (!content || !botId) {
    return "";
  }

  return content.replace(buildMentionRegex(botId), "").replace(/^\s+/, "").trim();
}

function splitDiscordMessage(text, limit = MENTION_LIMIT) {
  const normalized = String(text || "").replace(/\r\n/g, "\n").trim();

  if (normalized.length <= limit) {
    return [normalized];
  }

  const chunks = [];
  let remaining = normalized;
  let reopenFence = "";

  while (remaining.length > limit) {
    const availableLength = reopenFence ? limit - reopenFence.length - 1 : limit;
    let cut = remaining.lastIndexOf("\n", availableLength - 4);

    if (cut < availableLength * 0.5) {
      cut = remaining.lastIndexOf(" ", availableLength - 4);
    }

    if (cut < availableLength * 0.5) {
      cut = availableLength - 4;
    }

    let chunk = remaining.slice(0, cut).trim();

    if (!chunk) {
      chunk = remaining.slice(0, availableLength - 4).trim();
      cut = availableLength - 4;
    }

    const chunkWithPrefix = reopenFence ? `${reopenFence}\n${chunk}` : chunk;
    const fenceMatches = [...chunkWithPrefix.matchAll(/```[^\n]*/g)];
    const hasOpenFence = fenceMatches.length % 2 === 1;

    chunks.push(hasOpenFence ? `${chunkWithPrefix}\n\`\`\`` : chunkWithPrefix);
    reopenFence = hasOpenFence ? fenceMatches.at(-1)[0] : "";
    remaining = remaining.slice(cut).trimStart();
  }

  if (remaining.length) {
    chunks.push(reopenFence ? `${reopenFence}\n${remaining}` : remaining);
  }

  return chunks;
}

function humanizeBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return "unknown size";
  }

  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

module.exports = {
  isBotMentioned,
  stripBotMention,
  splitDiscordMessage,
  humanizeBytes,
};