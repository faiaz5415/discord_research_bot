const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");

const STORE_PATH = path.resolve(__dirname, "../../data/research/library.json");

let cache;

function ensureStore() {
  if (cache) {
    return cache;
  }

  try {
    cache = JSON.parse(fs.readFileSync(STORE_PATH, "utf8"));
  } catch {
    cache = { documents: [] };
  }

  return cache;
}

function saveStore() {
  fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
  fs.writeFileSync(STORE_PATH, JSON.stringify(ensureStore(), null, 2), "utf8");
}

function addLibraryDocument({ title, filename, text, userId, source = "discord-upload" }) {
  const store = ensureStore();
  const document = {
    id: randomUUID(),
    title: String(title || filename || "Untitled").trim(),
    filename: String(filename || "").trim(),
    text: String(text || "").trim(),
    userId: String(userId || "").trim(),
    source,
    createdAt: new Date().toISOString(),
  };

  store.documents.push(document);
  saveStore();
  return document;
}

function listLibraryDocuments() {
  return [...ensureStore().documents].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function searchLibraryDocuments(query) {
  const terms = String(query || "").toLowerCase().split(/\s+/).filter(Boolean);

  if (!terms.length) {
    return [];
  }

  return listLibraryDocuments().filter((document) => {
    const haystack = `${document.title}\n${document.filename}\n${document.text}`.toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

function removeLibraryDocument(documentId) {
  const store = ensureStore();
  const index = store.documents.findIndex((document) => document.id === documentId);

  if (index < 0) {
    return null;
  }

  const [removed] = store.documents.splice(index, 1);
  saveStore();
  return removed;
}

function getLibraryDocument(documentId) {
  return listLibraryDocuments().find((document) => document.id === documentId) || null;
}

module.exports = {
  addLibraryDocument,
  listLibraryDocuments,
  searchLibraryDocuments,
  removeLibraryDocument,
  getLibraryDocument,
};