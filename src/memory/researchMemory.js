const fs = require("fs");
const path = require("path");

const STORE_PATH = path.resolve(__dirname, "../../data/research/sessions.json");

let cache;

function ensureStore() {
  if (cache) {
    return cache;
  }

  try {
    cache = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  } catch {
    cache = {};
  }

  return cache;
}

function saveStore() {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(ensureStore(), null, 2), "utf8");
}

function getSessionKey(scope) {
  return [scope.guildId || "dm", scope.channelId || "channel", scope.userId || "user"].join(":");
}

function getSession(scope) {
  const store = ensureStore();
  return store[getSessionKey(scope)] || null;
}

function startSession(scope, topic) {
  const store = ensureStore();
  const key = getSessionKey(scope);

  store[key] = {
    topic: String(topic || "").trim(),
    sources: [],
    notes: [],
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveStore();
  return store[key];
}

function endSession(scope) {
  const store = ensureStore();
  delete store[getSessionKey(scope)];
  saveStore();
}

function addSessionResult(scope, { query, answer, sources }) {
  const store = ensureStore();
  const key = getSessionKey(scope);
  const session = store[key] || startSession(scope, query);

  session.updatedAt = new Date().toISOString();
  session.notes.push({
    query: String(query || ""),
    answer: String(answer || ""),
    createdAt: new Date().toISOString(),
  });

  for (const source of sources || []) {
    if (source?.url && !session.sources.some((item) => item.url === source.url)) {
      session.sources.push(source);
    }
  }

  store[key] = session;
  saveStore();
  return session;
}

function buildSessionContext(scope) {
  const session = getSession(scope);

  if (!session) {
    return "";
  }

  return [
    `Active research session: ${session.topic || "Untitled"}`,
    session.sources.length ? `Known sources:\n${session.sources.map((source, index) => `${index + 1}. ${source.title} — ${source.url}`).join("\n")}` : "Known sources: none yet",
  ].join("\n");
}

function listSessionSources(scope) {
  const session = getSession(scope);
  return session?.sources || [];
}

module.exports = {
  getSession,
  startSession,
  endSession,
  addSessionResult,
  buildSessionContext,
  listSessionSources,
};