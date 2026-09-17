const fs = require("fs");
const path = require("path");

const STORE_PATH = path.resolve(__dirname, "../../data/conversations/conversations.json");
const MAX_TURNS = 12;

let cache;

function ensureStore() {
  if (cache) {
    return cache;
  }

  try {
    const raw = fs.readFileSync(STORE_PATH, "utf8");
    cache = JSON.parse(raw);
  } catch {
    cache = {};
  }

  return cache;
}

function saveStore() {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(ensureStore(), null, 2), "utf8");
}

function getScopeKey({ guildId, channelId, userId }) {
  return [guildId || "dm", channelId || "channel", userId || "user"].join(":");
}

function getConversation(scope) {
  const store = ensureStore();
  const key = getScopeKey(scope);
  return store[key] || [];
}

function appendConversationTurn(scope, role, content) {
  const store = ensureStore();
  const key = getScopeKey(scope);
  const turns = store[key] || [];

  turns.push({
    role,
    content: String(content || ""),
    createdAt: new Date().toISOString(),
  });

  store[key] = turns.slice(-MAX_TURNS);
  saveStore();
}

function clearConversation(scope) {
  const store = ensureStore();
  delete store[getScopeKey(scope)];
  saveStore();
}

function buildConversationContext(scope) {
  const turns = getConversation(scope);

  if (!turns.length) {
    return "";
  }

  return [
    "Recent conversation context:",
    ...turns.map((turn) => `${turn.role === "assistant" ? "Assistant" : "User"}: ${turn.content}`),
  ].join("\n");
}

module.exports = {
  getScopeKey,
  getConversation,
  appendConversationTurn,
  clearConversation,
  buildConversationContext,
};