const path = require("path");
const mammoth = require("mammoth");
const { analyzeCsvBuffer, extractWorkbookSummary } = require("../data/spreadsheetHandler");
const { analyzeJsonText } = require("../data/dataAnalyzer");
const { extractPdfText } = require("./pdfHandler");
const { AppError } = require("../utils/errors");

const TEXT_EXTENSIONS = new Set([
  ".txt",
  ".md",
  ".json",
  ".js",
  ".cjs",
  ".mjs",
  ".ts",
  ".tsx",
  ".jsx",
  ".py",
  ".java",
  ".cpp",
  ".c",
  ".h",
  ".hpp",
  ".go",
  ".rb",
  ".php",
  ".html",
  ".css",
  ".xml",
  ".yaml",
  ".yml",
  ".toml",
  ".sql",
  ".rs",
  ".sh",
]);

function truncateText(text, limit = 50000) {
  const normalized = String(text || "").trim();
  return normalized.length > limit ? `${normalized.slice(0, limit)}\n\n[Truncated]` : normalized;
}

async function extractDocxText(buffer) {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return truncateText(result.value);
  } catch (error) {
    throw new AppError(`Failed to read DOCX: ${error.message}`, "DOCX_READ_FAILED", 400);
  }
}

function extractTextBuffer(buffer) {
  return truncateText(buffer.toString("utf8"));
}

function extractJsonBuffer(buffer) {
  return analyzeJsonText(buffer.toString("utf8"));
}

async function extractDocumentText({ filename, buffer }) {
  const extension = path.extname(filename).toLowerCase();

  if (extension === ".pdf") {
    return extractPdfText(buffer);
  }

  if (extension === ".docx") {
    return extractDocxText(buffer);
  }

  if (extension === ".xlsx" || extension === ".xlsm" || extension === ".xls") {
    return extractWorkbookSummary(buffer);
  }

  if (extension === ".csv") {
    return JSON.stringify(analyzeCsvBuffer(buffer), null, 2);
  }

  if (extension === ".json") {
    return extractJsonBuffer(buffer);
  }

  if (TEXT_EXTENSIONS.has(extension)) {
    return extractTextBuffer(buffer);
  }

  throw new AppError(`Unsupported file type: ${extension || "unknown"}`, "UNSUPPORTED_FILE_TYPE", 400);
}

module.exports = {
  extractDocumentText,
  truncateText,
};