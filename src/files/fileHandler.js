const path = require("path");
const { env } = require("../config/env");
const { AppError } = require("../utils/errors");
const { humanizeBytes } = require("../utils/discord");
const { extractDocumentText, truncateText } = require("./documentHandler");

function getAttachmentKind(filename) {
  const extension = path.extname(filename).toLowerCase();

  if (extension === ".pdf") {
    return "pdf";
  }

  if (extension === ".docx") {
    return "docx";
  }

  if (extension === ".xlsx" || extension === ".xls" || extension === ".xlsm") {
    return "spreadsheet";
  }

  if (extension === ".csv") {
    return "csv";
  }

  if (extension === ".json") {
    return "json";
  }

  if ([".js", ".cjs", ".mjs", ".ts", ".tsx", ".jsx", ".py", ".java", ".cpp", ".c", ".h", ".hpp", ".go", ".rb", ".php", ".html", ".css", ".yaml", ".yml", ".toml", ".sql", ".rs", ".sh", ".md", ".txt", ".xml"].includes(extension)) {
    return "text";
  }

  return "unsupported";
}

async function fetchAttachmentBuffer(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new AppError(`Failed to download attachment: ${response.status} ${response.statusText}`, "ATTACHMENT_DOWNLOAD_FAILED", 400);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function processAttachment(attachment) {
  if (!attachment?.url || !attachment?.filename) {
    throw new AppError("Attachment metadata is incomplete.", "INVALID_ATTACHMENT", 400);
  }

  if (Number.isFinite(attachment.size) && attachment.size > env.MAX_ATTACHMENT_SIZE_MB * 1024 * 1024) {
    throw new AppError(`Attachment ${attachment.filename} is too large (${humanizeBytes(attachment.size)}). Maximum allowed size is ${env.MAX_ATTACHMENT_SIZE_MB} MB.`, "ATTACHMENT_TOO_LARGE", 400);
  }

  const kind = getAttachmentKind(attachment.filename);

  if (kind === "unsupported") {
    throw new AppError(`Unsupported file type: ${attachment.filename}`, "UNSUPPORTED_FILE_TYPE", 400);
  }

  const buffer = await fetchAttachmentBuffer(attachment.url);
  const text = await extractDocumentText({ filename: attachment.filename, buffer });

  return {
    filename: attachment.filename,
    kind,
    size: attachment.size || buffer.length,
    text: truncateText(text),
  };
}

async function processAttachments(attachments) {
  const items = Array.isArray(attachments) ? attachments : [];
  const processed = [];

  for (const attachment of items) {
    processed.push(await processAttachment(attachment));
  }

  return processed;
}

module.exports = {
  getAttachmentKind,
  processAttachment,
  processAttachments,
};